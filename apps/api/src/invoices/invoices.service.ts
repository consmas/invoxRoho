import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CounterpartyType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateInvoiceDto) {
    if (new Date(dto.dueDate) <= new Date(dto.issueDate)) {
      throw new BadRequestException('dueDate must be after issueDate');
    }

    const [programme, buyer, supplier] = await Promise.all([
      this.prisma.programme.findUnique({ where: { id: dto.programmeId } }),
      this.prisma.counterparty.findUnique({ where: { id: dto.buyerId } }),
      this.prisma.counterparty.findUnique({ where: { id: dto.supplierId } }),
    ]);

    if (!programme) {
      throw new BadRequestException('programmeId is invalid');
    }
    if (!buyer || buyer.type !== CounterpartyType.ANCHOR) {
      throw new BadRequestException('buyerId must reference an anchor');
    }
    if (!supplier || supplier.type !== CounterpartyType.SUPPLIER) {
      throw new BadRequestException('supplierId must reference a supplier');
    }
    if (programme.anchorId !== buyer.id) {
      throw new BadRequestException('buyerId must match the programme anchor');
    }

    const participant = await this.prisma.programmeParticipant.findUnique({
      where: {
        programmeId_counterpartyId_participantType: {
          programmeId: dto.programmeId,
          counterpartyId: dto.supplierId,
          participantType: CounterpartyType.SUPPLIER,
        },
      },
    });
    if (!participant || !participant.isActive) {
      throw new BadRequestException(
        'supplier must be an active participant in the programme',
      );
    }

    const duplicate = await this.prisma.invoice.findUnique({
      where: {
        buyerId_supplierId_invoiceNumber: {
          buyerId: dto.buyerId,
          supplierId: dto.supplierId,
          invoiceNumber: dto.invoiceNumber,
        },
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        'invoiceNumber already exists for this buyer and supplier',
      );
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        ...dto,
        validationErrors: dto.validationErrors as Prisma.InputJsonValue,
        attachmentMetadata: dto.attachmentMetadata as Prisma.InputJsonValue,
        currency: dto.currency ?? 'GHS',
        ingestionChannel: dto.ingestionChannel ?? 'MANUAL',
        financeableAmount:
          dto.financeableAmount ??
          dto.amount -
            (dto.creditNoteAmount ?? 0) -
            (dto.paidAmount ?? 0) -
            (dto.disputedAmount ?? 0),
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
      },
    });
    await this.audit.log({
      action: AuditAction.CREATE,
      entityType: 'Invoice',
      entityId: invoice.id,
      afterJson: invoice,
    });
    await this.queueWebhookDeliveries(
      'invoice.created',
      'Invoice',
      invoice.id,
      invoice,
    );
    return invoice;
  }

  findAll() {
    return this.prisma.invoice.findMany({
      include: { programme: true, buyer: true, supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { programme: true, buyer: true, supplier: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const before = await this.findOne(id);
    const relationIds = {
      programmeId: dto.programmeId ?? before.programmeId,
      buyerId: dto.buyerId ?? before.buyerId,
      supplierId: dto.supplierId ?? before.supplierId,
    };
    await this.validateInvoiceRelations(relationIds);
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...dto,
        validationErrors: dto.validationErrors as Prisma.InputJsonValue,
        attachmentMetadata: dto.attachmentMetadata as Prisma.InputJsonValue,
        financeableAmount:
          dto.financeableAmount ??
          (dto.amount == null
            ? undefined
            : dto.amount -
              (dto.creditNoteAmount ?? 0) -
              (dto.paidAmount ?? 0) -
              (dto.disputedAmount ?? 0)),
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: invoice.id,
      beforeJson: before,
      afterJson: invoice,
    });
    return invoice;
  }

  private async validateInvoiceRelations(dto: {
    programmeId: string;
    buyerId: string;
    supplierId: string;
  }) {
    const [programme, buyer, supplier] = await Promise.all([
      this.prisma.programme.findUnique({ where: { id: dto.programmeId } }),
      this.prisma.counterparty.findUnique({ where: { id: dto.buyerId } }),
      this.prisma.counterparty.findUnique({ where: { id: dto.supplierId } }),
    ]);
    if (!programme) {
      throw new BadRequestException('programmeId is invalid');
    }
    if (!buyer || buyer.type !== CounterpartyType.ANCHOR) {
      throw new BadRequestException('buyerId must reference an anchor');
    }
    if (!supplier || supplier.type !== CounterpartyType.SUPPLIER) {
      throw new BadRequestException('supplierId must reference a supplier');
    }
    if (programme.anchorId !== buyer.id) {
      throw new BadRequestException('buyerId must match the programme anchor');
    }
    const participant = await this.prisma.programmeParticipant.findUnique({
      where: {
        programmeId_counterpartyId_participantType: {
          programmeId: dto.programmeId,
          counterpartyId: dto.supplierId,
          participantType: CounterpartyType.SUPPLIER,
        },
      },
    });
    if (!participant || !participant.isActive) {
      throw new BadRequestException(
        'supplierId must be an active supplier on the programme',
      );
    }
  }

  async approve(id: string) {
    const before = await this.findOne(id);
    if (
      before.status === InvoiceStatus.CANCELLED ||
      before.status === InvoiceStatus.FINANCED
    ) {
      throw new BadRequestException(
        'cancelled or financed invoices cannot be approved',
      );
    }
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.APPROVED,
        buyerApprovedAt: new Date(),
      },
    });
    await this.audit.log({
      action: AuditAction.APPROVE,
      entityType: 'Invoice',
      entityId: invoice.id,
      beforeJson: before,
      afterJson: invoice,
    });
    await this.queueWebhookDeliveries(
      'invoice.approved',
      'Invoice',
      invoice.id,
      invoice,
    );
    const row = await this.findOne(invoice.id);
    await this.notifications
      .createLifecycleEmail('invoice.approved', row.supplier.contactEmail, {
        entityName: row.invoiceNumber,
        status: row.status,
      })
      .catch(() => undefined);
    return invoice;
  }

  async remove(id: string) {
    const before = await this.findOne(id);
    if (
      before.status === InvoiceStatus.FINANCED ||
      before.status === InvoiceStatus.SETTLED
    ) {
      throw new BadRequestException(
        'financed or settled invoices cannot be deleted; use dispute/adjustment workflows',
      );
    }
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Deleted from invoice management',
      },
    });
    await this.audit.log({
      action: AuditAction.DELETE,
      entityType: 'Invoice',
      entityId: invoice.id,
      beforeJson: before,
      afterJson: invoice,
      reason: 'Logical delete: invoice cancelled',
    });
    return invoice;
  }

  private async queueWebhookDeliveries(
    eventType: string,
    entityType: string,
    entityId: string,
    payload: unknown,
  ) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ events: { has: eventType } }, { events: { has: '*' } }],
      },
    });
    await Promise.all(
      endpoints.map((endpoint) =>
        this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            eventType,
            entityType,
            entityId,
            payloadJson: payload as Prisma.InputJsonValue,
          },
        }),
      ),
    );
  }
}
