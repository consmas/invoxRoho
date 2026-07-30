import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, OnboardingStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { UpdateCounterpartyDto } from './dto/update-counterparty.dto';

const counterpartyInclude = {
  bankAccounts: true,
  uboRecords: true,
  directors: true,
  documents: true,
  consentRecords: true,
} satisfies Prisma.CounterpartyInclude;

@Injectable()
export class CounterpartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateCounterpartyDto) {
    const data = this.toCounterpartyCreateInput(dto);
    const counterparty = await this.prisma.counterparty.create({
      data,
      include: counterpartyInclude,
    });
    await this.audit.log({
      action: AuditAction.CREATE,
      entityType: 'Counterparty',
      entityId: counterparty.id,
      afterJson: counterparty,
    });
    if (counterparty.onboardingStatus === OnboardingStatus.SUBMITTED) {
      await this.notifyCounterparty('kyc.submitted', counterparty, {
        entityName: counterparty.legalName,
        status: counterparty.onboardingStatus,
      });
    }
    return counterparty;
  }

  findAll() {
    return this.prisma.counterparty.findMany({
      include: counterpartyInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const counterparty = await this.prisma.counterparty.findUnique({
      where: { id },
      include: counterpartyInclude,
    });
    if (!counterparty) {
      throw new NotFoundException('Counterparty not found');
    }
    return counterparty;
  }

  async update(id: string, dto: UpdateCounterpartyDto) {
    const before = await this.findOne(id);
    const data = this.toCounterpartyUpdateInput(dto);
    const counterparty = await this.prisma.counterparty.update({
      where: { id },
      data,
      include: counterpartyInclude,
    });
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'Counterparty',
      entityId: counterparty.id,
      beforeJson: before,
      afterJson: counterparty,
    });
    if (
      before.onboardingStatus !== OnboardingStatus.SUBMITTED &&
      counterparty.onboardingStatus === OnboardingStatus.SUBMITTED
    ) {
      await this.notifyCounterparty('kyc.submitted', counterparty, {
        entityName: counterparty.legalName,
        status: counterparty.onboardingStatus,
      });
    }
    return counterparty;
  }

  async approveKyc(
    id: string,
    actorUserId?: string,
    hasComplianceOverride = false,
  ) {
    const before = await this.findOne(id);
    if (!hasComplianceOverride) {
      await this.assertComplianceReadyForApproval(id);
    }
    const counterparty = await this.prisma.counterparty.update({
      where: { id },
      data: {
        onboardingStatus: 'APPROVED',
        onboardingProgress: 100,
        approvedAt: new Date(),
      },
      include: counterpartyInclude,
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.APPROVE,
      entityType: 'Counterparty',
      entityId: id,
      beforeJson: before,
      afterJson: counterparty,
      reason: 'KYC approved',
    });
    await this.notifyCounterparty('kyc.approved', counterparty, {
      entityName: counterparty.legalName,
      status: counterparty.onboardingStatus,
    });
    return counterparty;
  }

  private async assertComplianceReadyForApproval(counterpartyId: string) {
    const requiredTypes = [
      'BUSINESS_VERIFICATION',
      'SANCTIONS',
      'PEP',
      'ADVERSE_MEDIA',
    ];
    const checks = await this.prisma.complianceCheck.findMany({
      where: { counterpartyId },
      orderBy: { checkedAt: 'desc' },
    });
    const latestByType = new Map<string, (typeof checks)[number]>();
    for (const check of checks) {
      if (!latestByType.has(check.checkType)) {
        latestByType.set(check.checkType, check);
      }
    }
    const missing = requiredTypes.filter((type) => !latestByType.has(type));
    if (missing.length) {
      throw new BadRequestException(
        `KYC approval blocked; missing compliance checks: ${missing.join(', ')}`,
      );
    }
    const blockers = Array.from(latestByType.values()).filter((check) => {
      const approvedReview = ['APPROVED', 'FALSE_POSITIVE'].includes(
        check.reviewDecision ?? '',
      );
      return (
        !approvedReview &&
        (check.status === 'FAILED' ||
          check.status === 'REVIEW_REQUIRED' ||
          check.normalizedResult === 'MATCH' ||
          check.normalizedResult === 'FAILED' ||
          check.normalizedResult === 'REFERRED' ||
          check.reviewRequired)
      );
    });
    if (blockers.length) {
      throw new BadRequestException(
        `KYC approval blocked by compliance issues: ${blockers
          .map((check) => `${check.checkType}:${check.normalizedResult}`)
          .join(', ')}`,
      );
    }
    const counterparty = await this.prisma.counterparty.findUnique({
      where: { id: counterpartyId },
      include: { uboRecords: true },
    });
    const uboIds = counterparty?.uboRecords.map((ubo) => ubo.id) ?? [];
    if (uboIds.length) {
      const uboChecks = await this.prisma.complianceCheck.findMany({
        where: { uboRecordId: { in: uboIds } },
      });
      for (const uboId of uboIds) {
        const person = uboChecks.some(
          (check) =>
            check.uboRecordId === uboId &&
            check.checkType === 'PERSON_VERIFICATION' &&
            ['VERIFIED', 'CLEAR'].includes(check.normalizedResult),
        );
        const screening = uboChecks.some(
          (check) =>
            check.uboRecordId === uboId &&
            ['SANCTIONS', 'PEP', 'ADVERSE_MEDIA'].includes(check.checkType) &&
            check.normalizedResult === 'CLEAR',
        );
        if (!person || !screening) {
          throw new BadRequestException(
            'KYC approval blocked; UBO KYC and screening checks are incomplete',
          );
        }
      }
    }
  }

  async rejectKyc(id: string, reason: string, actorUserId?: string) {
    const before = await this.findOne(id);
    const counterparty = await this.prisma.counterparty.update({
      where: { id },
      data: {
        onboardingStatus: 'REJECTED',
        rejectedAt: new Date(),
        onboardingDecisionReason: reason,
      },
      include: counterpartyInclude,
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.REJECT,
      entityType: 'Counterparty',
      entityId: id,
      beforeJson: before,
      afterJson: counterparty,
      reason,
    });
    await this.notifyCounterparty('kyc.rejected', counterparty, {
      entityName: counterparty.legalName,
      status: counterparty.onboardingStatus,
      reason,
    });
    return counterparty;
  }

  private async notifyCounterparty(
    templateKey: string,
    counterparty: { contactEmail?: string | null },
    variables: Record<string, unknown>,
  ) {
    await this.notifications
      .createLifecycleEmail(templateKey, counterparty.contactEmail, variables)
      .catch(() => undefined);
  }

  private toCounterpartyCreateInput(
    dto: CreateCounterpartyDto,
  ): Prisma.CounterpartyCreateInput {
    const {
      bankAccounts,
      uboRecords,
      directors,
      documents,
      consentRecords,
      ...counterparty
    } = dto;

    return {
      ...counterparty,
      country: counterparty.country ?? 'GH',
      lastScreenedAt: this.toDate(counterparty.lastScreenedAt),
      nextReviewDate: this.toDate(counterparty.nextReviewDate),
      consentAcceptedAt: this.toDate(counterparty.consentAcceptedAt),
      dataProcessingAgreementAcceptedAt: this.toDate(
        counterparty.dataProcessingAgreementAcceptedAt,
      ),
      bankAccounts: bankAccounts?.length
        ? {
            create: bankAccounts.map((row) => ({
              ...row,
              currency: row.currency ?? 'GHS',
            })),
          }
        : undefined,
      uboRecords: uboRecords?.length
        ? {
            create: uboRecords.map((row) => ({
              ...row,
              dateOfBirth: this.toDate(row.dateOfBirth),
            })),
          }
        : undefined,
      directors: directors?.length
        ? {
            create: directors.map((row) => ({
              ...row,
              dateOfBirth: this.toDate(row.dateOfBirth),
            })),
          }
        : undefined,
      documents: documents?.length
        ? {
            create: documents.map((row) => ({
              ...row,
              issuedAt: this.toDate(row.issuedAt),
              expiresAt: this.toDate(row.expiresAt),
            })),
          }
        : undefined,
      consentRecords: consentRecords?.length
        ? {
            create: consentRecords.map((row) => ({
              ...row,
              acceptedAt: this.toDate(row.acceptedAt) ?? new Date(),
            })),
          }
        : undefined,
    };
  }

  private toCounterpartyUpdateInput(
    dto: UpdateCounterpartyDto,
  ): Prisma.CounterpartyUpdateInput {
    const {
      bankAccounts,
      uboRecords,
      directors,
      documents,
      consentRecords,
      ...counterparty
    } = dto;

    return {
      ...counterparty,
      lastScreenedAt: this.toDate(counterparty.lastScreenedAt),
      nextReviewDate: this.toDate(counterparty.nextReviewDate),
      consentAcceptedAt: this.toDate(counterparty.consentAcceptedAt),
      dataProcessingAgreementAcceptedAt: this.toDate(
        counterparty.dataProcessingAgreementAcceptedAt,
      ),
      submittedAt: this.toDate(counterparty.submittedAt),
      approvedAt: this.toDate(counterparty.approvedAt),
      rejectedAt: this.toDate(counterparty.rejectedAt),
      bankAccounts: bankAccounts
        ? {
            deleteMany: {},
            create: bankAccounts.map((row) => ({
              ...row,
              currency: row.currency ?? 'GHS',
            })),
          }
        : undefined,
      uboRecords: uboRecords
        ? {
            deleteMany: {},
            create: uboRecords.map((row) => ({
              ...row,
              dateOfBirth: this.toDate(row.dateOfBirth),
            })),
          }
        : undefined,
      directors: directors
        ? {
            deleteMany: {},
            create: directors.map((row) => ({
              ...row,
              dateOfBirth: this.toDate(row.dateOfBirth),
            })),
          }
        : undefined,
      documents: documents
        ? {
            deleteMany: {},
            create: documents.map((row) => ({
              ...row,
              issuedAt: this.toDate(row.issuedAt),
              expiresAt: this.toDate(row.expiresAt),
            })),
          }
        : undefined,
      consentRecords: consentRecords
        ? {
            deleteMany: {},
            create: consentRecords.map((row) => ({
              ...row,
              acceptedAt: this.toDate(row.acceptedAt) ?? new Date(),
            })),
          }
        : undefined,
    };
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }
}
