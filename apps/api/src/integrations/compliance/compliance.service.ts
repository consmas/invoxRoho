import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  Prisma,
  ScreeningStatus,
  VerificationStatus,
} from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { IntegrationLogService } from '../integration-log.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ComplianceNormalizedResult,
  ComplianceProviderResult,
} from './providers/compliance-provider-result';
import { KybProvider } from './providers/kyb-provider.interface';
import { KycProvider } from './providers/kyc-provider.interface';
import { MockKybProvider } from './providers/mock-kyb.provider';
import { MockKycProvider } from './providers/mock-kyc.provider';
import { MockScreeningProvider } from './providers/mock-screening.provider';
import { ScreeningProvider } from './providers/screening-provider.interface';
import { ReviewComplianceCheckDto } from './dto/review-compliance-check.dto';

const REVIEW_ROLE = 'COMPLIANCE_OFFICER';

@Injectable()
export class ComplianceService {
  private readonly kybProvider: KybProvider;
  private readonly kycProvider: KycProvider;
  private readonly screeningProvider: ScreeningProvider;
  private readonly kybProviderKey: string;
  private readonly kycProviderKey: string;
  private readonly screeningProviderKey: string;
  private readonly kycRescheduleDays: number;
  private readonly screeningRescheduleDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: IntegrationLogService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    config: ConfigService,
  ) {
    this.kybProviderKey = config.get<string>('KYB_PROVIDER') ?? 'mock';
    this.kycProviderKey = config.get<string>('KYC_PROVIDER') ?? 'mock';
    this.screeningProviderKey =
      config.get<string>('SCREENING_PROVIDER') ?? 'mock';
    this.kybProvider = new MockKybProvider();
    this.kycProvider = new MockKycProvider();
    this.screeningProvider = new MockScreeningProvider();
    this.kycRescheduleDays = Number(
      config.get<string>('KYC_RESCHEDULE_DAYS') ?? 365,
    );
    this.screeningRescheduleDays = Number(
      config.get<string>('SCREENING_RESCHEDULE_DAYS') ?? 90,
    );
  }

  findChecks() {
    return this.prisma.complianceCheck.findMany({
      include: { counterparty: true, uboRecord: true, reviewedBy: true },
      orderBy: { checkedAt: 'desc' },
      take: 500,
    });
  }

  async findCheck(id: string) {
    const row = await this.prisma.complianceCheck.findUnique({
      where: { id },
      include: { counterparty: true, uboRecord: true, reviewedBy: true },
    });
    if (!row) throw new NotFoundException('Compliance check not found');
    return row;
  }

  reviewQueue() {
    return this.prisma.complianceCheck.findMany({
      where: {
        OR: [
          { reviewRequired: true },
          { status: 'REVIEW_REQUIRED' },
          { normalizedResult: 'MATCH' },
          { normalizedResult: 'REFERRED' },
        ],
        reviewDecision: null,
      },
      include: { counterparty: true, uboRecord: true },
      orderBy: [{ riskLevel: 'desc' }, { checkedAt: 'desc' }],
      take: 500,
    });
  }

  async summary() {
    const now = new Date();
    const [
      totalChecks,
      clearChecks,
      verifiedChecks,
      reviewRequired,
      failedChecks,
      sanctionsMatches,
      pepMatches,
      adverseMediaMatches,
      expiredChecks,
      checksDueForReview,
    ] = await Promise.all([
      this.prisma.complianceCheck.count(),
      this.prisma.complianceCheck.count({
        where: { normalizedResult: 'CLEAR' },
      }),
      this.prisma.complianceCheck.count({
        where: { normalizedResult: 'VERIFIED' },
      }),
      this.prisma.complianceCheck.count({
        where: {
          OR: [{ reviewRequired: true }, { status: 'REVIEW_REQUIRED' }],
        },
      }),
      this.prisma.complianceCheck.count({
        where: { OR: [{ status: 'FAILED' }, { normalizedResult: 'FAILED' }] },
      }),
      this.prisma.complianceCheck.count({
        where: { checkType: 'SANCTIONS', normalizedResult: 'MATCH' },
      }),
      this.prisma.complianceCheck.count({
        where: { checkType: 'PEP', normalizedResult: 'MATCH' },
      }),
      this.prisma.complianceCheck.count({
        where: { checkType: 'ADVERSE_MEDIA', normalizedResult: 'MATCH' },
      }),
      this.prisma.complianceCheck.count({ where: { status: 'EXPIRED' } }),
      this.prisma.complianceCheck.count({
        where: { expiresAt: { lte: now }, status: { not: 'EXPIRED' } },
      }),
    ]);
    return {
      totalChecks,
      clearChecks,
      verifiedChecks,
      reviewRequired,
      failedChecks,
      sanctionsMatches,
      pepMatches,
      adverseMediaMatches,
      expiredChecks,
      checksDueForReview,
    };
  }

  async runBusinessVerification(counterpartyId: string, actorUserId?: string) {
    const counterparty = await this.prisma.counterparty.findUnique({
      where: { id: counterpartyId },
    });
    if (!counterparty) throw new NotFoundException('Counterparty not found');
    const request = {
      legalName: counterparty.legalName,
      registrationNumber: counterparty.registrationNumber,
      tin: counterparty.tin,
      country: counterparty.country,
    };
    const result = await this.kybProvider.verifyBusiness(request);
    const check = await this.persistCheck({
      counterpartyId,
      checkType: 'BUSINESS_VERIFICATION',
      providerType: 'KYB',
      providerKey: this.kybProviderKey,
      request,
      result,
      expiresAt: daysFromNow(this.kycRescheduleDays),
    });
    await this.prisma.counterparty.update({
      where: { id: counterpartyId },
      data: {
        kybStatus: verificationStatus(result),
        registryVerificationStatus: verificationStatus(result),
        screeningStatus: result.reviewRequired ? 'REVIEW_REQUIRED' : 'VERIFIED',
        lastKybCheckAt: check.checkedAt,
        nextKybReviewAt: check.expiresAt,
        complianceReviewStatus: result.reviewRequired
          ? 'REVIEW_REQUIRED'
          : 'CLEAR',
        complianceNotes: result.reason,
      },
    });
    await this.afterCheck(
      check.id,
      counterpartyId,
      undefined,
      result,
      actorUserId,
    );
    return { check: await this.findCheck(check.id), result };
  }

  async runPersonVerification(uboRecordId: string, actorUserId?: string) {
    const ubo = await this.prisma.uboRecord.findUnique({
      where: { id: uboRecordId },
      include: { counterparty: true },
    });
    if (!ubo) throw new NotFoundException('UBO record not found');
    const request = {
      fullName: ubo.fullName,
      idNumber: ubo.idNumber,
      idType: ubo.idType,
      nationality: ubo.nationality,
      dateOfBirth: ubo.dateOfBirth,
    };
    const result = await this.kycProvider.verifyPerson(request);
    const check = await this.persistCheck({
      counterpartyId: ubo.counterpartyId,
      uboRecordId,
      checkType: 'PERSON_VERIFICATION',
      providerType: 'KYC',
      providerKey: this.kycProviderKey,
      request,
      result,
      expiresAt: daysFromNow(this.kycRescheduleDays),
    });
    await this.prisma.uboRecord.update({
      where: { id: uboRecordId },
      data: {
        kycStatus: result.reviewRequired ? 'REVIEW_REQUIRED' : 'VERIFIED',
        lastKycCheckAt: check.checkedAt,
        nextKycReviewAt: check.expiresAt,
        complianceReviewStatus: result.reviewRequired
          ? 'REVIEW_REQUIRED'
          : 'CLEAR',
        complianceNotes: result.reason,
      },
    });
    await this.afterCheck(
      check.id,
      ubo.counterpartyId,
      uboRecordId,
      result,
      actorUserId,
    );
    return { check: await this.findCheck(check.id), result };
  }

  async runCounterpartyScreening(counterpartyId: string, actorUserId?: string) {
    const counterparty = await this.prisma.counterparty.findUnique({
      where: { id: counterpartyId },
    });
    if (!counterparty) throw new NotFoundException('Counterparty not found');
    const request = {
      name: counterparty.legalName,
      registrationNumber: counterparty.registrationNumber,
      country: counterparty.country,
    };
    const result = await this.screeningProvider.screenBusiness(request);
    const checks = await this.persistScreeningChecks({
      counterpartyId,
      request,
      result,
      entityType: 'Counterparty',
      entityId: counterpartyId,
    });
    await this.prisma.counterparty.update({
      where: { id: counterpartyId },
      data: {
        sanctionsScreeningStatus: screeningStatus(result, 'SANCTIONS'),
        pepScreeningStatus: screeningStatus(result, 'PEP'),
        adverseMediaScreeningStatus: screeningStatus(result, 'ADVERSE_MEDIA'),
        sanctionsStatus: complianceStatus(result, 'SANCTIONS'),
        pepStatus: complianceStatus(result, 'PEP'),
        adverseMediaStatus: complianceStatus(result, 'ADVERSE_MEDIA'),
        screeningStatus: result.reviewRequired ? 'REVIEW_REQUIRED' : 'CLEAR',
        lastScreenedAt: new Date(),
        lastScreeningAt: new Date(),
        nextScreeningAt: daysFromNow(this.screeningRescheduleDays),
        complianceReviewStatus: result.reviewRequired
          ? 'REVIEW_REQUIRED'
          : 'CLEAR',
        complianceNotes: result.reason,
      },
    });
    await this.afterCheck(
      checks[0].id,
      counterpartyId,
      undefined,
      result,
      actorUserId,
    );
    return { checks, result };
  }

  async runUboScreening(uboRecordId: string, actorUserId?: string) {
    const ubo = await this.prisma.uboRecord.findUnique({
      where: { id: uboRecordId },
      include: { counterparty: true },
    });
    if (!ubo) throw new NotFoundException('UBO record not found');
    const request = {
      name: ubo.fullName,
      idNumber: ubo.idNumber,
      nationality: ubo.nationality,
      dateOfBirth: ubo.dateOfBirth,
    };
    const result = await this.screeningProvider.screenPerson(request);
    const checks = await this.persistScreeningChecks({
      counterpartyId: ubo.counterpartyId,
      uboRecordId,
      request,
      result,
      entityType: 'UboRecord',
      entityId: uboRecordId,
    });
    await this.prisma.uboRecord.update({
      where: { id: uboRecordId },
      data: {
        screeningStatus: result.reviewRequired
          ? ScreeningStatus.POSSIBLE_MATCH
          : ScreeningStatus.CLEAR,
        sanctionsStatus: complianceStatus(result, 'SANCTIONS'),
        pepStatus: complianceStatus(result, 'PEP'),
        adverseMediaStatus: complianceStatus(result, 'ADVERSE_MEDIA'),
        lastScreeningAt: new Date(),
        nextScreeningAt: daysFromNow(this.screeningRescheduleDays),
        complianceReviewStatus: result.reviewRequired
          ? 'REVIEW_REQUIRED'
          : 'CLEAR',
        complianceNotes: result.reason,
      },
    });
    await this.afterCheck(
      checks[0].id,
      ubo.counterpartyId,
      uboRecordId,
      result,
      actorUserId,
    );
    return { checks, result };
  }

  async runCounterpartyFullComplianceCheck(
    counterpartyId: string,
    actorUserId?: string,
  ) {
    const kyb = await this.runBusinessVerification(counterpartyId, actorUserId);
    const screening = await this.runCounterpartyScreening(
      counterpartyId,
      actorUserId,
    );
    return { kyb, screening };
  }

  async runUboFullComplianceCheck(uboRecordId: string, actorUserId?: string) {
    const kyc = await this.runPersonVerification(uboRecordId, actorUserId);
    const screening = await this.runUboScreening(uboRecordId, actorUserId);
    return { kyc, screening };
  }

  async reviewComplianceCheck(
    checkId: string,
    payload: ReviewComplianceCheckDto,
    actorUserId?: string,
  ) {
    const before = await this.findCheck(checkId);
    const row = await this.prisma.complianceCheck.update({
      where: { id: checkId },
      data: {
        reviewRequired: false,
        reviewedById: actorUserId,
        reviewedAt: new Date(),
        reviewDecision: payload.decision,
        reviewNotes: payload.notes,
        status:
          payload.decision === 'ESCALATED' || payload.decision === 'TRUE_MATCH'
            ? 'REVIEW_REQUIRED'
            : 'COMPLETED',
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.APPROVE,
      entityType: 'ComplianceCheck',
      entityId: checkId,
      beforeJson: before,
      afterJson: row,
      reason: payload.notes ?? payload.decision,
    });
    await this.notifications
      .createLifecycleEmail(
        payload.decision === 'REJECTED' || payload.decision === 'TRUE_MATCH'
          ? 'kyc.rejected'
          : 'kyc.approved',
        before.counterparty?.contactEmail,
        {
          entityName:
            before.counterparty?.legalName ??
            before.uboRecord?.fullName ??
            checkId,
          reason: payload.notes ?? payload.decision,
          status: payload.decision,
        },
        actorUserId,
      )
      .catch(() => undefined);
    return row;
  }

  async expireComplianceCheck(checkId: string, actorUserId?: string) {
    const before = await this.findCheck(checkId);
    const row = await this.prisma.complianceCheck.update({
      where: { id: checkId },
      data: { status: 'EXPIRED' },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'ComplianceCheck',
      entityId: checkId,
      beforeJson: before,
      afterJson: row,
      reason: 'Compliance check expired',
    });
    return row;
  }

  scheduleNextReview(checkId: string) {
    return this.prisma.complianceCheck.update({
      where: { id: checkId },
      data: { expiresAt: daysFromNow(this.screeningRescheduleDays) },
    });
  }

  private async persistCheck(params: {
    counterpartyId?: string;
    uboRecordId?: string;
    checkType: string;
    providerType: string;
    providerKey: string;
    request: unknown;
    result: ComplianceProviderResult;
    expiresAt?: Date;
  }) {
    const check = await this.prisma.complianceCheck.create({
      data: {
        counterpartyId: params.counterpartyId,
        uboRecordId: params.uboRecordId,
        checkType: params.checkType,
        providerType: params.providerType,
        providerKey: params.providerKey,
        providerReference: params.result.providerReference,
        status: params.result.status,
        normalizedResult: params.result.normalizedResult,
        reviewRequired: params.result.reviewRequired,
        riskLevel: params.result.riskLevel,
        reason: params.result.reason,
        requestJson: params.request as Prisma.InputJsonValue,
        responseJson: params.result.rawResponse as Prisma.InputJsonValue,
        expiresAt: params.expiresAt,
      },
    });
    await this.logs.create({
      providerType: params.providerType,
      providerKey: params.providerKey,
      direction: 'OUTBOUND',
      operation: `compliance.${params.checkType.toLowerCase()}`,
      entityType: 'ComplianceCheck',
      entityId: check.id,
      requestJson: params.request,
      responseJson: params.result,
      status: params.result.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
    });
    return check;
  }

  private async persistScreeningChecks(params: {
    counterpartyId: string;
    uboRecordId?: string;
    request: unknown;
    result: ComplianceProviderResult;
    entityType: string;
    entityId: string;
  }) {
    const checkTypes = ['SANCTIONS', 'PEP', 'ADVERSE_MEDIA'];
    const checks: Awaited<ReturnType<ComplianceService['persistCheck']>>[] = [];
    for (const checkType of checkTypes) {
      const checkResult = splitScreeningResult(params.result, checkType);
      checks.push(
        await this.persistCheck({
          counterpartyId: params.counterpartyId,
          uboRecordId: params.uboRecordId,
          checkType,
          providerType: 'SCREENING',
          providerKey: this.screeningProviderKey,
          request: params.request,
          result: checkResult,
          expiresAt: daysFromNow(this.screeningRescheduleDays),
        }),
      );
    }
    return checks;
  }

  private async afterCheck(
    checkId: string,
    counterpartyId: string,
    uboRecordId: string | undefined,
    result: ComplianceProviderResult,
    actorUserId?: string,
  ) {
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'ComplianceCheck',
      entityId: checkId,
      afterJson: result,
      reason: result.reason,
    });
    if (result.reviewRequired) {
      await this.prisma.workflowCase.create({
        data: {
          caseType: 'COMPLIANCE_REVIEW',
          status: 'OPEN',
          priority: result.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          assignedRole: REVIEW_ROLE,
          counterpartyId,
          historyJson: {
            checkId,
            uboRecordId,
            result: result as unknown as Prisma.InputJsonValue,
          },
        },
      });
      await this.notifications
        .createLifecycleEmail(
          result.normalizedResult === 'MATCH'
            ? 'kyc.rejected'
            : 'kyc.submitted',
          undefined,
          {
            entityName: uboRecordId ?? counterpartyId,
            status: result.normalizedResult,
            reason: result.reason ?? 'Compliance review required',
          },
          actorUserId,
        )
        .catch(() => undefined);
    }
  }
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function verificationStatus(result: ComplianceProviderResult) {
  if (result.normalizedResult === 'VERIFIED')
    return VerificationStatus.VERIFIED;
  if (result.normalizedResult === 'REFERRED')
    return VerificationStatus.MANUAL_REVIEW;
  return VerificationStatus.FAILED;
}

function screeningStatus(result: ComplianceProviderResult, checkType: string) {
  return splitScreeningResult(result, checkType).normalizedResult === 'MATCH'
    ? ScreeningStatus.CONFIRMED_MATCH
    : ScreeningStatus.CLEAR;
}

function complianceStatus(result: ComplianceProviderResult, checkType: string) {
  return splitScreeningResult(result, checkType).normalizedResult === 'MATCH'
    ? 'REVIEW_REQUIRED'
    : 'CLEAR';
}

function splitScreeningResult(
  result: ComplianceProviderResult,
  checkType: string,
): ComplianceProviderResult {
  const reason = result.reason?.toUpperCase() ?? '';
  const isMatch =
    result.normalizedResult === 'MATCH' &&
    ((checkType === 'SANCTIONS' && reason.includes('SANCTION')) ||
      (checkType === 'PEP' && reason.includes('PEP')) ||
      (checkType === 'ADVERSE_MEDIA' && reason.includes('ADVERSE')));
  if (!isMatch) {
    return {
      ...result,
      status: 'COMPLETED',
      normalizedResult: 'CLEAR',
      riskLevel: 'LOW',
      reviewRequired: false,
      reason: `${checkType} clear`,
    };
  }
  return {
    ...result,
    status: 'REVIEW_REQUIRED',
    normalizedResult: 'MATCH' satisfies ComplianceNormalizedResult,
    reviewRequired: true,
  };
}
