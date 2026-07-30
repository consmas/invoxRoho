import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, DocumentStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { IntegrationLogService } from '../integrations/integration-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  RejectDocumentDto,
  UpdateDocumentDto,
  UploadDocumentDto,
} from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly logs: IntegrationLogService,
    private readonly config: ConfigService,
  ) {}

  findAll() {
    return this.prisma.documentRecord.findMany({
      where: { status: { not: DocumentStatus.DELETED } },
      include: { counterparty: true, programme: true, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.documentRecord.findUnique({
      where: { id },
      include: { counterparty: true, programme: true, invoice: true },
    });
    if (!row || row.status === DocumentStatus.DELETED) {
      throw new NotFoundException('Document not found');
    }
    return row;
  }

  async upload(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype?: string;
      size?: number;
    },
    dto: UploadDocumentDto,
    actorUserId?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('file is required');
    }
    this.validateUpload(file);
    const folder = this.documentFolder(dto);
    const started = Date.now();
    const stored = await this.storage
      .upload({
        buffer: file.buffer,
        fileName: file.originalname,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        folder,
      })
      .catch(async (error: unknown) => {
        await this.logs.create({
          providerType: 'STORAGE',
          providerKey: this.storage.providerKey,
          direction: 'OUTBOUND',
          operation: 'storage.upload',
          requestJson: {
            fileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size ?? file.buffer.length,
            folder,
          },
          responseJson: { error: safeError(error) },
          status: 'FAILED',
          durationMs: Date.now() - started,
        });
        throw new BadRequestException('Document upload failed');
      });
    const row = await this.prisma.documentRecord.create({
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        status: this.initialStatus(dto.documentType),
        originalFileName: file.originalname,
        fileName: stored.fileKey.split('/').at(-1) ?? file.originalname,
        fileKey: stored.fileKey,
        fileUrl: stored.fileUrl,
        storageUrl: stored.fileUrl,
        mimeType: file.mimetype,
        sizeBytes: stored.sizeBytes,
        checksum: stored.checksum,
        storageProvider: stored.storageProvider,
        uploadedById: actorUserId,
        metadataJson: { uploadSource: 'api' },
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'DocumentRecord',
      entityId: row.id,
      afterJson: row,
      reason: 'Document uploaded',
    });
    await this.logs.create({
      providerType: 'STORAGE',
      providerKey:
        stored.storageProvider === 's3' ? 'digitalocean_spaces' : 'local',
      direction: 'OUTBOUND',
      operation: 'storage.upload',
      entityType: 'DocumentRecord',
      entityId: row.id,
      requestJson: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: stored.sizeBytes,
        folder,
      },
      responseJson: {
        fileKey: stored.fileKey,
        storageProvider: stored.storageProvider,
        checksum: stored.checksum,
      },
      status: 'SUCCESS',
      durationMs: Date.now() - started,
    });
    return row;
  }

  async update(id: string, dto: UpdateDocumentDto, actorUserId?: string) {
    const before = await this.findOne(id);
    const row = await this.prisma.documentRecord.update({
      where: { id },
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'DocumentRecord',
      entityId: id,
      beforeJson: before,
      afterJson: row,
    });
    return row;
  }

  async download(id: string, actorUserId?: string) {
    const row = await this.findOne(id);
    await this.audit.log({
      actorUserId,
      action: AuditAction.SUBMIT,
      entityType: 'DocumentRecord',
      entityId: id,
      reason: 'Document download requested',
    });
    const buffer = await this.storage.download(row.fileKey);
    return { row, buffer };
  }

  async getDownloadUrl(id: string, actorUserId?: string) {
    const row = await this.findOne(id);
    const expiresInSeconds = Number(
      this.config.get<string>('SIGNED_URL_EXPIRY_SECONDS') ?? 300,
    );
    const signedUrl = await this.storage.getSignedUrl(
      row.fileKey,
      expiresInSeconds,
    );
    await this.audit.log({
      actorUserId,
      action: AuditAction.SUBMIT,
      entityType: 'DocumentRecord',
      entityId: id,
      reason: 'Document download URL requested',
    });
    await this.logs.create({
      providerType: 'STORAGE',
      providerKey:
        row.storageProvider === 's3' ? 'digitalocean_spaces' : 'local',
      direction: 'OUTBOUND',
      operation: 'storage.download_url',
      entityType: 'DocumentRecord',
      entityId: id,
      requestJson: { fileKey: row.fileKey },
      responseJson: { signedUrl: Boolean(signedUrl), expiresInSeconds },
      status: 'SUCCESS',
    });
    return signedUrl
      ? { downloadUrl: signedUrl, expiresInSeconds }
      : { downloadUrl: `/documents/${id}/download`, expiresInSeconds: null };
  }

  async verify(id: string, actorUserId?: string) {
    const before = await this.findOne(id);
    const row = await this.prisma.documentRecord.update({
      where: { id },
      data: {
        status: DocumentStatus.VERIFIED,
        verifiedById: actorUserId,
        verifiedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.APPROVE,
      entityType: 'DocumentRecord',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: 'Document verified',
    });
    return row;
  }

  async reject(id: string, dto: RejectDocumentDto, actorUserId?: string) {
    const before = await this.findOne(id);
    const row = await this.prisma.documentRecord.update({
      where: { id },
      data: {
        status: DocumentStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: dto.reason,
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.REJECT,
      entityType: 'DocumentRecord',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: dto.reason,
    });
    return row;
  }

  async remove(id: string, actorUserId?: string) {
    const before = await this.findOne(id);
    const row = await this.prisma.documentRecord.update({
      where: { id },
      data: { status: DocumentStatus.DELETED },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'DocumentRecord',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: 'Document soft deleted',
    });
    await this.logs.create({
      providerType: 'STORAGE',
      providerKey:
        before.storageProvider === 's3' ? 'digitalocean_spaces' : 'local',
      direction: 'OUTBOUND',
      operation: 'storage.delete',
      entityType: 'DocumentRecord',
      entityId: id,
      requestJson: { fileKey: before.fileKey },
      responseJson: { softDeleteOnly: true },
      status: 'SUCCESS',
    });
    return row;
  }

  private validateUpload(file: {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    size?: number;
  }) {
    const maxMb = Number(this.config.get<string>('MAX_UPLOAD_MB') ?? 20);
    const sizeBytes = file.size ?? file.buffer.length;
    if (sizeBytes > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb} MB upload limit`);
    }
    const allowed = (
      this.config.get<string>('ALLOWED_UPLOAD_MIME_TYPES') ??
      'application/pdf,image/jpeg,image/png,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (file.mimetype && !allowed.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
  }

  private documentFolder(dto: UploadDocumentDto) {
    if (dto.counterpartyId) return `counterparties/${dto.counterpartyId}`;
    if (dto.programmeId) return `programmes/${dto.programmeId}`;
    if (dto.invoiceId) return `invoices/${dto.invoiceId}`;
    if (dto.financingTransactionId)
      return `financing/${dto.financingTransactionId}`;
    return 'general';
  }

  private initialStatus(documentType: string) {
    const normalized = documentType.toUpperCase();
    return normalized.includes('KYC') || normalized.includes('KYB')
      ? DocumentStatus.PENDING_VERIFICATION
      : DocumentStatus.ACTIVE;
  }
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : 'Storage provider failed';
}
