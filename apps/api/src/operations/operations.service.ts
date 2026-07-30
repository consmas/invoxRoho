import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export type OperationResource =
  | 'limits'
  | 'exposures'
  | 'credit-decisions'
  | 'funder-profiles'
  | 'provenance'
  | 'obligations'
  | 'reconciliation'
  | 'investors'
  | 'documents'
  | 'workflow-cases'
  | 'notifications'
  | 'reports'
  | 'dynamic-discounting-offers'
  | 'receivables-facilities'
  | 'funder-marketplace-bids'
  | 'esg-scorecards'
  | 'integration-connections'
  | 'ai-anomaly-signals'
  | 'investor-report-snapshots';

const resources = new Set<OperationResource>([
  'limits',
  'exposures',
  'credit-decisions',
  'funder-profiles',
  'provenance',
  'obligations',
  'reconciliation',
  'investors',
  'documents',
  'workflow-cases',
  'notifications',
  'reports',
  'dynamic-discounting-offers',
  'receivables-facilities',
  'funder-marketplace-bids',
  'esg-scorecards',
  'integration-connections',
  'ai-anomaly-signals',
  'investor-report-snapshots',
]);

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async dashboard() {
    const [
      openObligations,
      pastDueObligations,
      unmatchedReconciliation,
      openWorkflowCases,
      pendingNotifications,
      activeLimits,
      activeFunders,
      activeReports,
      openDynamicDiscountingOffers,
      activeReceivablesFacilities,
      openMarketplaceBids,
      activeEsgScorecards,
      activeIntegrationConnections,
      openAiAnomalySignals,
      investorReportSnapshots,
      pendingOutboundPayments,
      failedPayments,
      failedNotifications,
      failedIntegrations,
      failedWebhookDeliveries,
      pendingDocumentVerifications,
    ] = await Promise.all([
      this.prisma.maturityObligation.count({
        where: { status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
      }),
      this.prisma.maturityObligation.count({
        where: { status: { in: ['PAST_DUE', 'DEFAULTED'] } },
      }),
      this.prisma.reconciliationItem.count({
        where: {
          status: { in: ['UNMATCHED', 'PARTIALLY_MATCHED', 'INVESTIGATING'] },
        },
      }),
      this.prisma.workflowCase.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] } },
      }),
      this.prisma.notificationLog.count({ where: { status: 'PENDING' } }),
      this.prisma.limitRecord.count({ where: { status: 'ACTIVE' } }),
      this.prisma.funderProfile.count({ where: { isActive: true } }),
      this.prisma.reportDefinition.count({ where: { isActive: true } }),
      this.prisma.dynamicDiscountingOffer.count({
        where: { status: { in: ['OFFERED', 'REQUESTED'] } },
      }),
      this.prisma.receivablesFacility.count({
        where: { status: { in: ['ACTIVE', 'APPROVED'] } },
      }),
      this.prisma.funderMarketplaceBid.count({
        where: { participationStatus: { in: ['SUBMITTED', 'CONFIRMED'] } },
      }),
      this.prisma.esgScorecard.count({ where: { status: 'ACTIVE' } }),
      this.prisma.integrationConnection.count({
        where: { status: { in: ['CONFIGURED', 'ACTIVE'] } },
      }),
      this.prisma.aiAnomalySignal.count({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      this.prisma.investorReportSnapshot.count(),
      this.prisma.payment.count({
        where: { direction: 'OUTBOUND', status: { in: ['INITIATED', 'SENT'] } },
      }),
      this.prisma.payment.count({
        where: { status: { in: ['FAILED', 'RETURNED'] } },
      }),
      this.prisma.notificationLog.count({ where: { status: 'FAILED' } }),
      this.prisma.integrationConnection.count({ where: { status: 'FAILED' } }),
      this.prisma.webhookDelivery.count({ where: { status: 'FAILED' } }),
      this.prisma.documentRecord.count({
        where: { status: 'PENDING_VERIFICATION' },
      }),
    ]);

    const exposure = await this.prisma.exposureSnapshot.aggregate({
      _sum: { exposureAmount: true },
    });
    const obligations = await this.prisma.maturityObligation.aggregate({
      _sum: { outstandingAmount: true },
    });
    const debits = await this.prisma.ledgerEntry.aggregate({
      where: { entryType: 'DEBIT' },
      _sum: { amount: true },
    });
    const credits = await this.prisma.ledgerEntry.aggregate({
      where: { entryType: 'CREDIT' },
      _sum: { amount: true },
    });

    return {
      openObligations,
      pastDueObligations,
      unmatchedReconciliation,
      openWorkflowCases,
      pendingNotifications,
      activeLimits,
      activeFunders,
      activeReports,
      openDynamicDiscountingOffers,
      activeReceivablesFacilities,
      openMarketplaceBids,
      activeEsgScorecards,
      activeIntegrationConnections,
      openAiAnomalySignals,
      investorReportSnapshots,
      pendingOutboundPayments,
      failedPayments,
      failedNotifications,
      failedIntegrations,
      failedWebhookDeliveries,
      pendingDocumentVerifications,
      totalExposure: exposure._sum.exposureAmount ?? 0,
      totalOutstanding: obligations._sum.outstandingAmount ?? 0,
      ledgerDebitTotal: debits._sum.amount ?? 0,
      ledgerCreditTotal: credits._sum.amount ?? 0,
      ledgerImbalance:
        Number(debits._sum.amount ?? 0) - Number(credits._sum.amount ?? 0),
    };
  }

  findAll(resource: string) {
    const key = this.asResource(resource);
    switch (key) {
      case 'limits':
        return this.prisma.limitRecord.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'exposures':
        return this.prisma.exposureSnapshot.findMany({
          orderBy: { asOfDate: 'desc' },
        });
      case 'credit-decisions':
        return this.prisma.creditDecision.findMany({
          orderBy: { decidedAt: 'desc' },
        });
      case 'funder-profiles':
        return this.prisma.funderProfile.findMany({
          include: { counterparty: true },
          orderBy: { createdAt: 'desc' },
        });
      case 'provenance':
        return this.prisma.invoiceProvenanceRecord.findMany({
          orderBy: { capturedAt: 'desc' },
        });
      case 'obligations':
        return this.prisma.maturityObligation.findMany({
          include: { programme: true, financingTransaction: true },
          orderBy: { dueDate: 'asc' },
        });
      case 'reconciliation':
        return this.prisma.reconciliationItem.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'investors':
        return this.prisma.investorRecord.findMany({
          include: { counterparty: true },
          orderBy: { createdAt: 'desc' },
        });
      case 'documents':
        return this.prisma.documentRecord.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'workflow-cases':
        return this.prisma.workflowCase.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'notifications':
        return this.prisma.notificationLog.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'reports':
        return this.prisma.reportDefinition.findMany({
          orderBy: { category: 'asc' },
        });
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.findMany({
          orderBy: { asOfDate: 'desc' },
        });
      case 'integration-connections':
        return this.prisma.integrationConnection.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.findMany({
          orderBy: { generatedAt: 'desc' },
        });
    }
  }

  async create(
    resource: string,
    data: Record<string, unknown>,
    actorUserId?: string,
  ) {
    const key = this.asResource(resource);
    const normalized = this.normalize(data);
    const record = await this.createRecord(key, normalized);
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: `Operations:${key}`,
      entityId:
        typeof record === 'object' && record && 'id' in record
          ? String(record.id)
          : undefined,
      afterJson: record,
    });
    return record;
  }

  async update(
    resource: string,
    id: string,
    data: Record<string, unknown>,
    actorUserId?: string,
  ) {
    const key = this.asResource(resource);
    const normalized = this.normalize(data);
    const before = await this.findOneForUpdate(key, id);
    const record = await this.updateRecord(key, id, normalized);
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: `Operations:${key}`,
      entityId: id,
      beforeJson: before,
      afterJson: record,
    });
    return record;
  }

  private createRecord(
    resource: OperationResource,
    data: Record<string, unknown>,
  ) {
    switch (resource) {
      case 'limits':
        return this.prisma.limitRecord.create({
          data: data as Prisma.LimitRecordUncheckedCreateInput,
        });
      case 'exposures':
        return this.prisma.exposureSnapshot.create({
          data: data as Prisma.ExposureSnapshotUncheckedCreateInput,
        });
      case 'credit-decisions':
        return this.prisma.creditDecision.create({
          data: data as Prisma.CreditDecisionUncheckedCreateInput,
        });
      case 'funder-profiles':
        return this.prisma.funderProfile.create({
          data: data as Prisma.FunderProfileUncheckedCreateInput,
        });
      case 'provenance':
        return this.prisma.invoiceProvenanceRecord.create({
          data: data as Prisma.InvoiceProvenanceRecordUncheckedCreateInput,
        });
      case 'obligations':
        return this.prisma.maturityObligation.create({
          data: data as Prisma.MaturityObligationUncheckedCreateInput,
        });
      case 'reconciliation':
        return this.prisma.reconciliationItem.create({
          data: data as Prisma.ReconciliationItemUncheckedCreateInput,
        });
      case 'investors':
        return this.prisma.investorRecord.create({
          data: data as Prisma.InvestorRecordUncheckedCreateInput,
        });
      case 'documents':
        return this.prisma.documentRecord.create({
          data: data as Prisma.DocumentRecordUncheckedCreateInput,
        });
      case 'workflow-cases':
        return this.prisma.workflowCase.create({
          data: data as Prisma.WorkflowCaseUncheckedCreateInput,
        });
      case 'notifications':
        return this.prisma.notificationLog.create({
          data: data as Prisma.NotificationLogUncheckedCreateInput,
        });
      case 'reports':
        return this.prisma.reportDefinition.create({
          data: data as Prisma.ReportDefinitionCreateInput,
        });
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.create({
          data: data as Prisma.DynamicDiscountingOfferUncheckedCreateInput,
        });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.create({
          data: data as Prisma.ReceivablesFacilityUncheckedCreateInput,
        });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.create({
          data: data as Prisma.FunderMarketplaceBidUncheckedCreateInput,
        });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.create({
          data: data as Prisma.EsgScorecardUncheckedCreateInput,
        });
      case 'integration-connections':
        return this.prisma.integrationConnection.create({
          data: data as Prisma.IntegrationConnectionCreateInput,
        });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.create({
          data: data as Prisma.AiAnomalySignalUncheckedCreateInput,
        });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.create({
          data: data as Prisma.InvestorReportSnapshotUncheckedCreateInput,
        });
    }
  }

  private findOneForUpdate(resource: OperationResource, id: string) {
    switch (resource) {
      case 'limits':
        return this.prisma.limitRecord.findUniqueOrThrow({ where: { id } });
      case 'obligations':
        return this.prisma.maturityObligation.findUniqueOrThrow({
          where: { id },
        });
      case 'reconciliation':
        return this.prisma.reconciliationItem.findUniqueOrThrow({
          where: { id },
        });
      case 'workflow-cases':
        return this.prisma.workflowCase.findUniqueOrThrow({ where: { id } });
      case 'notifications':
        return this.prisma.notificationLog.findUniqueOrThrow({ where: { id } });
      case 'reports':
        return this.prisma.reportDefinition.findUniqueOrThrow({
          where: { id },
        });
      case 'funder-profiles':
        return this.prisma.funderProfile.findUniqueOrThrow({ where: { id } });
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.findUniqueOrThrow({
          where: { id },
        });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.findUniqueOrThrow({
          where: { id },
        });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.findUniqueOrThrow({
          where: { id },
        });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.findUniqueOrThrow({ where: { id } });
      case 'integration-connections':
        return this.prisma.integrationConnection.findUniqueOrThrow({
          where: { id },
        });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.findUniqueOrThrow({ where: { id } });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.findUniqueOrThrow({
          where: { id },
        });
      case 'exposures':
      case 'credit-decisions':
      case 'provenance':
      case 'investors':
      case 'documents':
        throw new BadRequestException(
          `${resource} records are append-only from operations control`,
        );
    }
  }

  private updateRecord(
    resource: OperationResource,
    id: string,
    data: Record<string, unknown>,
  ) {
    switch (resource) {
      case 'limits':
        return this.prisma.limitRecord.update({
          where: { id },
          data: data,
        });
      case 'obligations':
        return this.prisma.maturityObligation.update({
          where: { id },
          data: data,
        });
      case 'reconciliation':
        return this.prisma.reconciliationItem.update({
          where: { id },
          data: data,
        });
      case 'workflow-cases':
        return this.prisma.workflowCase.update({
          where: { id },
          data: data,
        });
      case 'notifications':
        return this.prisma.notificationLog.update({
          where: { id },
          data: data,
        });
      case 'reports':
        return this.prisma.reportDefinition.update({
          where: { id },
          data: data,
        });
      case 'funder-profiles':
        return this.prisma.funderProfile.update({
          where: { id },
          data: data,
        });
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.update({
          where: { id },
          data: data,
        });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.update({
          where: { id },
          data: data,
        });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.update({
          where: { id },
          data: data,
        });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.update({
          where: { id },
          data: data,
        });
      case 'integration-connections':
        return this.prisma.integrationConnection.update({
          where: { id },
          data: data,
        });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.update({
          where: { id },
          data: data,
        });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.update({
          where: { id },
          data: data,
        });
      case 'exposures':
      case 'credit-decisions':
      case 'provenance':
      case 'investors':
      case 'documents':
        throw new BadRequestException(
          `${resource} records are append-only from operations control`,
        );
    }
  }

  private asResource(resource: string): OperationResource {
    if (!resources.has(resource as OperationResource)) {
      throw new BadRequestException(
        `Unsupported operations resource: ${resource}`,
      );
    }
    return resource as OperationResource;
  }

  private normalize(data: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        if (
          typeof value === 'string' &&
          (key.endsWith('At') ||
            key.endsWith('Date') ||
            key.endsWith('Until') ||
            key === 'dueDate' ||
            key === 'effectiveFrom' ||
            key === 'expiresAt' ||
            key === 'periodStart' ||
            key === 'periodEnd')
        ) {
          return [key, new Date(value)];
        }
        return [key, value];
      }),
    );
  }
}
