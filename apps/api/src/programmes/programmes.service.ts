import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CounterpartyType,
  Prisma,
  ProgrammeStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddProgrammeParticipantDto } from './dto/add-programme-participant.dto';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';

@Injectable()
export class ProgrammesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateProgrammeDto) {
    const anchor = await this.prisma.counterparty.findUnique({
      where: { id: dto.anchorId },
    });
    if (!anchor || anchor.type !== CounterpartyType.ANCHOR) {
      throw new BadRequestException(
        'anchorId must reference an anchor counterparty',
      );
    }

    const programme = await this.prisma.programme.create({
      data: this.toProgrammeCreateInput(dto),
    });
    await this.audit.log({
      action: AuditAction.CREATE,
      entityType: 'Programme',
      entityId: programme.id,
      afterJson: programme,
    });
    return programme;
  }

  findAll() {
    return this.prisma.programme.findMany({
      include: {
        anchor: true,
        participants: { include: { counterparty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const programme = await this.prisma.programme.findUnique({
      where: { id },
      include: {
        anchor: true,
        participants: { include: { counterparty: true } },
      },
    });
    if (!programme) {
      throw new NotFoundException('Programme not found');
    }
    return programme;
  }

  async update(id: string, dto: UpdateProgrammeDto) {
    const before = await this.findOne(id);
    const programme = await this.prisma.programme.update({
      where: { id },
      data: this.toProgrammeUpdateInput(dto),
    });
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'Programme',
      entityId: programme.id,
      beforeJson: before,
      afterJson: programme,
    });
    return programme;
  }

  async addParticipant(id: string, dto: AddProgrammeParticipantDto) {
    await this.findOne(id);
    const counterparty = await this.prisma.counterparty.findUnique({
      where: { id: dto.counterpartyId },
    });
    if (!counterparty || counterparty.type !== dto.participantType) {
      throw new BadRequestException(
        'counterpartyId must match the participantType',
      );
    }

    const existing = await this.prisma.programmeParticipant.findUnique({
      where: {
        programmeId_counterpartyId_participantType: {
          programmeId: id,
          counterpartyId: dto.counterpartyId,
          participantType: dto.participantType,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'counterparty is already a participant on this programme',
      );
    }

    return this.prisma.programmeParticipant.create({
      data: {
        programmeId: id,
        counterpartyId: dto.counterpartyId,
        participantType: dto.participantType,
        isActive: dto.isActive ?? true,
      },
      include: { counterparty: true },
    });
  }

  async setStatus(
    id: string,
    status: ProgrammeStatus,
    actorUserId?: string,
    reason?: string,
  ) {
    const before = await this.findOne(id);
    const programme = await this.prisma.programme.update({
      where: { id },
      data: {
        status,
        publishedAt: status === ProgrammeStatus.ACTIVE ? new Date() : undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action:
        status === ProgrammeStatus.ACTIVE
          ? AuditAction.APPROVE
          : AuditAction.UPDATE,
      entityType: 'Programme',
      entityId: id,
      beforeJson: before,
      afterJson: programme,
      reason,
    });
    const row = await this.findOne(id);
    if (status === ProgrammeStatus.ACTIVE) {
      await this.notifications
        .createLifecycleEmail(
          reason === 'Programme activated'
            ? 'programme.activated'
            : 'programme.approved',
          row.anchor.contactEmail,
          {
            entityName: row.name,
            status: row.status,
          },
          actorUserId,
        )
        .catch(() => undefined);
    }
    return row;
  }

  private toProgrammeCreateInput(dto: CreateProgrammeDto) {
    return {
      ...dto,
      currency: dto.currency ?? 'GHS',
      effectiveFrom: this.toDate(dto.effectiveFrom),
      effectiveTo: this.toDate(dto.effectiveTo),
      publishedAt: this.toDate(dto.publishedAt),
      expiresAt: this.toDate(dto.expiresAt),
      excludedCounterpartyIds: this.toJson(dto.excludedCounterpartyIds),
      approvalWorkflow: this.toJson(dto.approvalWorkflow),
      requiredDocuments: this.toJson(dto.requiredDocuments),
      eligibilityRules: this.toJson(dto.eligibilityRules),
      limitRules: this.toJson(dto.limitRules),
      pricingRules: this.toJson(dto.pricingRules),
      sandboxAssumptions: this.toJson(dto.sandboxAssumptions),
    } satisfies Prisma.ProgrammeUncheckedCreateInput;
  }

  private toProgrammeUpdateInput(dto: UpdateProgrammeDto) {
    return {
      ...dto,
      effectiveFrom: this.toDate(dto.effectiveFrom),
      effectiveTo: this.toDate(dto.effectiveTo),
      publishedAt: this.toDate(dto.publishedAt),
      expiresAt: this.toDate(dto.expiresAt),
      excludedCounterpartyIds: this.toJson(dto.excludedCounterpartyIds),
      approvalWorkflow: this.toJson(dto.approvalWorkflow),
      requiredDocuments: this.toJson(dto.requiredDocuments),
      eligibilityRules: this.toJson(dto.eligibilityRules),
      limitRules: this.toJson(dto.limitRules),
      pricingRules: this.toJson(dto.pricingRules),
      sandboxAssumptions: this.toJson(dto.sandboxAssumptions),
    } satisfies Prisma.ProgrammeUncheckedUpdateInput;
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private toJson(value?: unknown) {
    return value == null ? undefined : (value as Prisma.InputJsonValue);
  }
}
