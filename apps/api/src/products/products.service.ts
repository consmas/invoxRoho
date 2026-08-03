import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuditAction,
  LedgerEntryType,
  LimitScope,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export type ProductResource =
  | 'dynamic-discounting-offers'
  | 'receivables-facilities'
  | 'funder-marketplace-bids'
  | 'esg-scorecards'
  | 'ai-anomaly-signals'
  | 'investor-report-snapshots';

const resources = new Set<ProductResource>([
  'dynamic-discounting-offers',
  'receivables-facilities',
  'funder-marketplace-bids',
  'esg-scorecards',
  'ai-anomaly-signals',
  'investor-report-snapshots',
]);

const approvalThresholds = {
  dynamicDiscountingAmount: 50000,
  receivablesFacilityLimit: 100000,
  marketplaceBidAmount: 50000,
};

const jsonFields = new Set([
  'rulesJson',
  'eligibilityRules',
  'conditionsJson',
  'kpiJson',
  'evidenceJson',
  'rationaleJson',
  'reportJson',
]);

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async dashboard() {
    const [
      openDynamicDiscountingOffers,
      acceptedDynamicDiscountingOffers,
      activeReceivablesFacilities,
      submittedMarketplaceBids,
      confirmedMarketplaceBids,
      activeEsgScorecards,
      openAiAnomalySignals,
      highSeverityAiAnomalySignals,
      investorReportSnapshots,
    ] = await Promise.all([
      this.prisma.dynamicDiscountingOffer.count({
        where: { status: { in: ['OFFERED', 'REQUESTED'] } },
      }),
      this.prisma.dynamicDiscountingOffer.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.receivablesFacility.count({
        where: { status: { in: ['ACTIVE', 'APPROVED'] } },
      }),
      this.prisma.funderMarketplaceBid.count({ where: { participationStatus: 'SUBMITTED' } }),
      this.prisma.funderMarketplaceBid.count({ where: { participationStatus: 'CONFIRMED' } }),
      this.prisma.esgScorecard.count({ where: { status: 'ACTIVE' } }),
      this.prisma.aiAnomalySignal.count({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      this.prisma.aiAnomalySignal.count({
        where: {
          status: { in: ['OPEN', 'UNDER_REVIEW'] },
          severity: { in: ['HIGH', 'CRITICAL'] },
        },
      }),
      this.prisma.investorReportSnapshot.count(),
    ]);

    const dynamicDiscounting = await this.prisma.dynamicDiscountingOffer.aggregate({
      _sum: { invoiceAmount: true, discountAmount: true, netPaymentAmount: true },
    });
    const receivables = await this.prisma.receivablesFacility.aggregate({
      _sum: { facilityLimit: true, utilisedAmount: true },
    });
    const bids = await this.prisma.funderMarketplaceBid.aggregate({
      _sum: { offeredAmount: true },
    });
    const investorReports = await this.prisma.investorReportSnapshot.aggregate({
      _sum: { navAmount: true, committedCapital: true, drawnCapital: true },
    });

    return {
      openDynamicDiscountingOffers,
      acceptedDynamicDiscountingOffers,
      activeReceivablesFacilities,
      submittedMarketplaceBids,
      confirmedMarketplaceBids,
      activeEsgScorecards,
      openAiAnomalySignals,
      highSeverityAiAnomalySignals,
      investorReportSnapshots,
      dynamicDiscountingInvoiceAmount: dynamicDiscounting._sum.invoiceAmount ?? 0,
      dynamicDiscountingDiscountAmount: dynamicDiscounting._sum.discountAmount ?? 0,
      dynamicDiscountingNetPaymentAmount: dynamicDiscounting._sum.netPaymentAmount ?? 0,
      receivablesFacilityLimit: receivables._sum.facilityLimit ?? 0,
      receivablesUtilisedAmount: receivables._sum.utilisedAmount ?? 0,
      marketplaceOfferedAmount: bids._sum.offeredAmount ?? 0,
      investorNavAmount: investorReports._sum.navAmount ?? 0,
      investorCommittedCapital: investorReports._sum.committedCapital ?? 0,
      investorDrawnCapital: investorReports._sum.drawnCapital ?? 0,
    };
  }

  findAll(resource: string) {
    switch (this.asResource(resource)) {
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.findMany({ orderBy: { asOfDate: 'desc' }, take: 500 });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.findMany({ orderBy: { generatedAt: 'desc' }, take: 500 });
    }
  }

  findOne(resource: string, id: string) {
    return this.findOneByResource(this.asResource(resource), id);
  }

  async exportCsv(resource: string) {
    const rows = await this.findAll(resource);
    return toCsv(rows as Record<string, unknown>[]);
  }

  calculate(resource: string, data: Record<string, unknown>) {
    return this.calculateRecord(this.asResource(resource), this.normalize(data));
  }

  async create(resource: string, data: Record<string, unknown>, actorUserId?: string) {
    const key = this.asResource(resource);
    const normalized = this.applyCalculatedDefaults(
      key,
      this.normalize(data),
    );
    await this.validateRecord(key, normalized);
    const record = await this.createRecord(key, normalized);
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: `Product:${key}`,
      entityId: String(record.id),
      afterJson: record,
    });
    return record;
  }

  async update(resource: string, id: string, data: Record<string, unknown>, actorUserId?: string) {
    const key = this.asResource(resource);
    const before = await this.findOneByResource(key, id);
    this.assertEditable(key, before as Record<string, unknown>);
    const normalized = this.normalize(data);
    await this.validateRecord(key, { ...(before as Record<string, unknown>), ...normalized });
    const record = await this.updateRecord(key, id, normalized);
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: `Product:${key}`,
      entityId: id,
      beforeJson: before,
      afterJson: record,
    });
    return record;
  }

  async action(
    resource: string,
    id: string,
    action: string,
    data: Record<string, unknown>,
    actorUserId?: string,
    idempotencyKey?: string,
  ) {
    const key = this.asResource(resource);
    if (idempotencyKey) {
      const existing = await this.prisma.auditLog.findFirst({
        where: {
          entityType: `Product:${key}`,
          entityId: id,
          reason: `Product idempotency: ${idempotencyKey}`,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return {
          duplicate: true,
          auditLogId: existing.id,
          record: await this.findOneByResource(key, id),
        };
      }
    }
    const before = (await this.findOneByResource(key, id)) as Record<
      string,
      unknown
    >;
    if (this.requiresApproval(key, before, action, data)) {
      if (!actorUserId) {
        throw new BadRequestException('Authenticated user is required for approval requests');
      }
      const approval = await this.prisma.approvalRequest.create({
        data: {
          entityType: `Product:${key}`,
          entityId: id,
          action: 'PRODUCT_ACTION',
          requestedById: actorUserId,
          requestPayload: {
            resource: key,
            action,
            data,
            idempotencyKey,
          } as Prisma.InputJsonValue,
        },
      });
      await this.audit.log({
        actorUserId,
        action: AuditAction.CREATE,
        entityType: 'ApprovalRequest',
        entityId: approval.id,
        beforeJson: before,
        afterJson: approval,
        reason: `Product maker-checker required for ${action}`,
      });
      return {
        approvalRequired: true,
        approval,
        record: before,
      };
    }
    const patch = this.actionPatch(key, before, action, data, actorUserId);
    const record = await this.prisma.$transaction((tx) =>
      this.executeActionWithImpact(tx, key, id, before, patch, action),
    );
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: `Product:${key}`,
      entityId: id,
      beforeJson: before,
      afterJson: record,
      reason: `Product action: ${action}`,
    });
    if (idempotencyKey) {
      await this.audit.log({
        actorUserId,
        action: AuditAction.UPDATE,
        entityType: `Product:${key}`,
        entityId: id,
        afterJson: record,
        reason: `Product idempotency: ${idempotencyKey}`,
      });
    }
    return record;
  }

  async remove(resource: string, id: string, actorUserId?: string) {
    const key = this.asResource(resource);
    const before = await this.findOneByResource(key, id);
    const record = await this.deleteRecord(key, id);
    await this.audit.log({
      actorUserId,
      action: AuditAction.DELETE,
      entityType: `Product:${key}`,
      entityId: id,
      beforeJson: before,
      afterJson: record,
    });
    return record;
  }

  private createRecord(resource: ProductResource, data: Record<string, unknown>) {
    switch (resource) {
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

  private findOneByResource(resource: ProductResource, id: string) {
    switch (resource) {
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.findUniqueOrThrow({ where: { id } });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.findUniqueOrThrow({ where: { id } });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.findUniqueOrThrow({ where: { id } });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.findUniqueOrThrow({ where: { id } });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.findUniqueOrThrow({ where: { id } });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.findUniqueOrThrow({ where: { id } });
    }
  }

  private updateRecord(resource: ProductResource, id: string, data: Record<string, unknown>) {
    switch (resource) {
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.update({ where: { id }, data });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.update({ where: { id }, data });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.update({ where: { id }, data });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.update({ where: { id }, data });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.update({ where: { id }, data });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.update({ where: { id }, data });
    }
  }

  private deleteRecord(resource: ProductResource, id: string) {
    switch (resource) {
      case 'dynamic-discounting-offers':
        return this.prisma.dynamicDiscountingOffer.delete({ where: { id } });
      case 'receivables-facilities':
        return this.prisma.receivablesFacility.delete({ where: { id } });
      case 'funder-marketplace-bids':
        return this.prisma.funderMarketplaceBid.delete({ where: { id } });
      case 'esg-scorecards':
        return this.prisma.esgScorecard.delete({ where: { id } });
      case 'ai-anomaly-signals':
        return this.prisma.aiAnomalySignal.delete({ where: { id } });
      case 'investor-report-snapshots':
        return this.prisma.investorReportSnapshot.delete({ where: { id } });
    }
  }

  private calculateRecord(
    resource: ProductResource,
    data: Record<string, unknown>,
  ) {
    if (resource === 'dynamic-discounting-offers') {
      const invoiceAmount = numberValue(data.invoiceAmount);
      const discountRate = numberValue(data.discountRate);
      const daysAccelerated = numberValue(data.daysAccelerated);
      const dayCount = numberValue(data.dayCount ?? 360) || 360;
      const discountAmount = roundMoney(
        invoiceAmount * discountRate * (daysAccelerated / dayCount),
      );
      return {
        invoiceAmount,
        discountRate,
        daysAccelerated,
        discountAmount,
        netPaymentAmount: roundMoney(invoiceAmount - discountAmount),
        model: data.discountModel ?? 'STATIC_RATE',
      };
    }
    if (resource === 'receivables-facilities') {
      const facilityLimit = numberValue(data.facilityLimit);
      const advanceRate = numberValue(data.advanceRate);
      const reserveRate =
        data.reserveRate === undefined
          ? roundRate(1 - advanceRate)
          : numberValue(data.reserveRate);
      return {
        facilityLimit,
        advanceRate,
        reserveRate,
        maximumAdvanceAmount: roundMoney(facilityLimit * advanceRate),
        reserveAmount: roundMoney(facilityLimit * reserveRate),
      };
    }
    if (resource === 'funder-marketplace-bids') {
      const offeredAmount = numberValue(data.offeredAmount);
      const minYield = numberValue(data.minYield);
      const maxTenorDays = numberValue(data.maxTenorDays);
      return {
        offeredAmount,
        minYield,
        maxTenorDays,
        expectedReturn: roundMoney(
          offeredAmount * minYield * (maxTenorDays / 360),
        ),
      };
    }
    if (resource === 'esg-scorecards') {
      const score = numberValue(data.score);
      const pricingAdjustmentBps =
        data.pricingAdjustmentBps === undefined
          ? esgAdjustment(score)
          : numberValue(data.pricingAdjustmentBps);
      return {
        score,
        tier: data.tier ?? esgTier(score),
        pricingAdjustmentBps,
      };
    }
    if (resource === 'ai-anomaly-signals') {
      const score = numberValue(data.score);
      return {
        score,
        severity: data.severity ?? anomalySeverity(score),
      };
    }
    if (resource === 'investor-report-snapshots') {
      const navAmount = numberValue(data.navAmount);
      const committedCapital = numberValue(data.committedCapital);
      const drawnCapital = numberValue(data.drawnCapital);
      return {
        navAmount,
        committedCapital,
        drawnCapital,
        undrawnCapital: roundMoney(committedCapital - drawnCapital),
        navToCommittedRatio: committedCapital
          ? roundRate(navAmount / committedCapital)
          : 0,
      };
    }
  }

  private applyCalculatedDefaults(
    resource: ProductResource,
    data: Record<string, unknown>,
  ) {
    const calculated = this.calculateRecord(resource, data) as Record<
      string,
      unknown
    >;
    if (resource === 'dynamic-discounting-offers') {
      return {
        ...data,
        discountAmount: data.discountAmount ?? calculated.discountAmount,
        netPaymentAmount: data.netPaymentAmount ?? calculated.netPaymentAmount,
      };
    }
    if (resource === 'receivables-facilities') {
      return {
        ...data,
        reserveRate: data.reserveRate ?? calculated.reserveRate,
      };
    }
    if (resource === 'esg-scorecards') {
      return {
        ...data,
        tier: data.tier ?? calculated.tier,
        pricingAdjustmentBps:
          data.pricingAdjustmentBps ?? calculated.pricingAdjustmentBps,
      };
    }
    if (resource === 'ai-anomaly-signals') {
      return {
        ...data,
        severity: data.severity ?? calculated.severity,
      };
    }
    return data;
  }

  private requiresApproval(
    resource: ProductResource,
    record: Record<string, unknown>,
    action: string,
    data: Record<string, unknown>,
  ) {
    if (data.skipApproval === true) return false;
    if (
      resource === 'dynamic-discounting-offers' &&
      action === 'accept' &&
      numberValue(record.invoiceAmount) >= approvalThresholds.dynamicDiscountingAmount
    ) {
      return true;
    }
    if (
      resource === 'receivables-facilities' &&
      action === 'activate' &&
      numberValue(record.facilityLimit) >= approvalThresholds.receivablesFacilityLimit
    ) {
      return true;
    }
    if (
      resource === 'funder-marketplace-bids' &&
      action === 'allocate' &&
      numberValue(record.offeredAmount) >= approvalThresholds.marketplaceBidAmount
    ) {
      return true;
    }
    if (
      resource === 'esg-scorecards' &&
      action === 'activate' &&
      numberValue(record.pricingAdjustmentBps) !== 0
    ) {
      return true;
    }
    return false;
  }

  private async executeActionWithImpact(
    tx: Prisma.TransactionClient,
    resource: ProductResource,
    id: string,
    before: Record<string, unknown>,
    patch: Record<string, unknown>,
    action: string,
  ) {
    const record = await this.updateRecordWithTx(tx, resource, id, patch);
    await this.writeLifecycleImpact(tx, resource, record as Record<string, unknown>, action);
    return record;
  }

  private updateRecordWithTx(
    tx: Prisma.TransactionClient,
    resource: ProductResource,
    id: string,
    data: Record<string, unknown>,
  ) {
    switch (resource) {
      case 'dynamic-discounting-offers':
        return tx.dynamicDiscountingOffer.update({ where: { id }, data });
      case 'receivables-facilities':
        return tx.receivablesFacility.update({ where: { id }, data });
      case 'funder-marketplace-bids':
        return tx.funderMarketplaceBid.update({ where: { id }, data });
      case 'esg-scorecards':
        return tx.esgScorecard.update({ where: { id }, data });
      case 'ai-anomaly-signals':
        return tx.aiAnomalySignal.update({ where: { id }, data });
      case 'investor-report-snapshots':
        return tx.investorReportSnapshot.update({ where: { id }, data });
    }
  }

  private async writeLifecycleImpact(
    tx: Prisma.TransactionClient,
    resource: ProductResource,
    record: Record<string, unknown>,
    action: string,
  ) {
    if (resource === 'dynamic-discounting-offers' && action === 'settle') {
      await this.postBalancedLedger(tx, String(record.currency ?? 'GHS'), [
        ['5100', 'Dynamic discount expense', LedgerEntryType.DEBIT, record.discountAmount],
        ['1000', 'Cash settlement', LedgerEntryType.CREDIT, record.discountAmount],
      ]);
    }
    if (resource === 'receivables-facilities' && action === 'activate') {
      await this.upsertProductLimit(tx, {
        programmeId: optionalString(record.programmeId),
        counterpartyId: String(record.supplierId),
        currency: String(record.currency ?? 'GHS'),
        limitAmount: record.facilityLimit,
        source: 'receivables_facility_activation',
      });
      await this.writeProductExposure(tx, {
        programmeId: optionalString(record.programmeId),
        counterpartyId: String(record.supplierId),
        currency: String(record.currency ?? 'GHS'),
        exposureAmount: record.utilisedAmount ?? 0,
        availableLimit: new Prisma.Decimal(String(record.facilityLimit)).minus(
          new Prisma.Decimal(String(record.utilisedAmount ?? 0)),
        ),
        source: 'receivables_facility_activation',
      });
    }
    if (resource === 'funder-marketplace-bids' && action === 'allocate') {
      await this.postBalancedLedger(tx, String(record.currency ?? 'GHS'), [
        ['1200', 'Marketplace funded asset', LedgerEntryType.DEBIT, record.offeredAmount],
        ['2200', 'Marketplace funder allocation payable', LedgerEntryType.CREDIT, record.offeredAmount],
      ]);
      await this.writeProductExposure(tx, {
        counterpartyId: String(record.funderId),
        currency: String(record.currency ?? 'GHS'),
        exposureAmount: record.offeredAmount,
        source: 'marketplace_bid_allocation',
      });
    }
  }

  private async postBalancedLedger(
    tx: Prisma.TransactionClient,
    currency: string,
    entries: [string, string, LedgerEntryType, unknown][],
  ) {
    this.assertBalancedLedger(entries);
    for (const [code, name, entryType, amount] of entries) {
      const account = await tx.ledgerAccount.upsert({
        where: { code },
        update: {},
        create: { code, name, currency },
      });
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          entryType,
          amount: String(amount),
          currency,
          description: name,
        },
      });
    }
  }

  private assertBalancedLedger(
    entries: [string, string, LedgerEntryType, unknown][],
  ) {
    const totals = entries.reduce(
      (acc, [, , entryType, amount]) => {
        const value = new Prisma.Decimal(String(amount ?? 0));
        if (entryType === LedgerEntryType.DEBIT) acc.debits = acc.debits.plus(value);
        else acc.credits = acc.credits.plus(value);
        return acc;
      },
      { debits: new Prisma.Decimal(0), credits: new Prisma.Decimal(0) },
    );
    if (!totals.debits.equals(totals.credits)) {
      throw new BadRequestException('Product ledger posting is not balanced');
    }
  }

  private async upsertProductLimit(
    tx: Prisma.TransactionClient,
    input: {
      programmeId?: string;
      counterpartyId: string;
      currency: string;
      limitAmount: unknown;
      source: string;
    },
  ) {
    const existing = await tx.limitRecord.findFirst({
      where: {
        scope: LimitScope.SUPPLIER,
        programmeId: input.programmeId,
        counterpartyId: input.counterpartyId,
        currency: input.currency,
        status: 'ACTIVE',
      },
    });
    if (existing) return;
    await tx.limitRecord.create({
      data: {
        scope: LimitScope.SUPPLIER,
        programmeId: input.programmeId,
        counterpartyId: input.counterpartyId,
        currency: input.currency,
        limitAmount: String(input.limitAmount),
        availableAmount: String(input.limitAmount),
        covenantJson: { source: input.source, autoCreated: true },
      },
    });
  }

  private async writeProductExposure(
    tx: Prisma.TransactionClient,
    input: {
      programmeId?: string;
      counterpartyId: string;
      currency: string;
      exposureAmount: unknown;
      availableLimit?: unknown;
      source: string;
    },
  ) {
    await tx.exposureSnapshot.create({
      data: {
        scope: LimitScope.SUPPLIER,
        programmeId: input.programmeId,
        counterpartyId: input.counterpartyId,
        currency: input.currency,
        exposureAmount: String(input.exposureAmount ?? 0),
        availableLimit:
          input.availableLimit === undefined ? undefined : String(input.availableLimit),
        sourceJson: { source: input.source },
      },
    });
  }

  private asResource(resource: string): ProductResource {
    if (!resources.has(resource as ProductResource)) {
      throw new BadRequestException(`Unsupported product resource: ${resource}`);
    }
    return resource as ProductResource;
  }

  private normalize(data: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== '')
        .map(([key, value]) => {
          if (typeof value === 'string' && isDateField(key)) {
            return [key, new Date(value)];
          }
          if (typeof value === 'string' && jsonFields.has(key)) {
            return [key, parseJsonField(key, value)];
          }
          return [key, value];
        }),
    );
  }

  private async validateRecord(
    resource: ProductResource,
    data: Record<string, unknown>,
  ) {
    this.assertNonNegative(data, [
      'invoiceAmount',
      'buyerCashAvailable',
      'targetYield',
      'discountRate',
      'discountAmount',
      'netPaymentAmount',
      'facilityLimit',
      'advanceRate',
      'reserveRate',
      'utilisedAmount',
      'offeredAmount',
      'minYield',
      'maxTenorDays',
      'score',
      'navAmount',
      'committedCapital',
      'drawnCapital',
      'distributedCapital',
      'grossYield',
      'delinquencyRate',
      'weightedAverageLifeDays',
    ]);
    await this.assertLinkedRecords(resource, data);
    if (resource === 'dynamic-discounting-offers') {
      const invoiceAmount = numberValue(data.invoiceAmount);
      const discountAmount = numberValue(data.discountAmount);
      const netPaymentAmount = numberValue(data.netPaymentAmount);
      if (invoiceAmount <= 0) throw new BadRequestException('Invoice amount must be greater than zero');
      if (discountAmount > invoiceAmount) throw new BadRequestException('Discount amount cannot exceed invoice amount');
      if (Math.abs(invoiceAmount - discountAmount - netPaymentAmount) > 0.01) {
        throw new BadRequestException('Net payment must equal invoice amount minus discount amount');
      }
    }
    if (resource === 'receivables-facilities') {
      const facilityLimit = numberValue(data.facilityLimit);
      const utilisedAmount = numberValue(data.utilisedAmount ?? 0);
      if (facilityLimit <= 0) throw new BadRequestException('Facility limit must be greater than zero');
      if (utilisedAmount > facilityLimit) {
        throw new BadRequestException('Utilised amount cannot exceed facility limit');
      }
      for (const key of ['advanceRate', 'reserveRate']) {
        const value = numberValue(data[key] ?? 0);
        if (value > 1) throw new BadRequestException(`${key} must be expressed as a decimal rate up to 1`);
      }
    }
    if (resource === 'funder-marketplace-bids') {
      if (numberValue(data.offeredAmount) <= 0) {
        throw new BadRequestException('Offered amount must be greater than zero');
      }
      const validUntil = data.validUntil;
      if (
        data.participationStatus === 'CONFIRMED' &&
        validUntil instanceof Date &&
        validUntil.getTime() < Date.now()
      ) {
        throw new BadRequestException('Expired bids cannot be confirmed');
      }
    }
    if (resource === 'esg-scorecards') {
      const score = numberValue(data.score);
      if (score > 100) throw new BadRequestException('ESG score must be between 0 and 100');
    }
    if (resource === 'ai-anomaly-signals') {
      const score = numberValue(data.score);
      if (score > 1) throw new BadRequestException('Anomaly score must be between 0 and 1');
    }
    if (resource === 'investor-report-snapshots') {
      const start = data.periodStart instanceof Date ? data.periodStart : undefined;
      const end = data.periodEnd instanceof Date ? data.periodEnd : undefined;
      if (start && end && start.getTime() > end.getTime()) {
        throw new BadRequestException('Report period start cannot be after period end');
      }
    }
  }

  private async assertLinkedRecords(
    resource: ProductResource,
    data: Record<string, unknown>,
  ) {
    await Promise.all([
      this.assertExists('programme', data.programmeId),
      this.assertExists('invoice', data.invoiceId),
      this.assertExists('payment', data.paymentId),
      this.assertExists('financingTransaction', data.financingTransactionId),
      this.assertExists('counterparty', data.counterpartyId),
      this.assertExists('counterparty', data.buyerId),
      this.assertExists('counterparty', data.supplierId),
      this.assertExists('counterparty', data.debtorId),
      this.assertExists('counterparty', data.funderId),
    ]);
    if (resource === 'investor-report-snapshots') return;
  }

  private async assertExists(model: string, id: unknown) {
    if (!id) return;
    const delegate = (this.prisma as unknown as Record<string, { findUnique: (args: unknown) => Promise<unknown> }>)[model];
    const row = await delegate.findUnique({ where: { id: String(id) } });
    if (!row) throw new BadRequestException(`${model} ${String(id)} does not exist`);
  }

  private assertNonNegative(data: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      if (data[key] === undefined || data[key] === null) continue;
      if (numberValue(data[key]) < 0) {
        throw new BadRequestException(`${key} cannot be negative`);
      }
    }
  }

  private assertEditable(resource: ProductResource, record: Record<string, unknown>) {
    if (
      resource === 'dynamic-discounting-offers' &&
      ['ACCEPTED', 'SETTLED'].includes(String(record.status))
    ) {
      throw new BadRequestException('Accepted or settled offers must be changed through lifecycle actions');
    }
  }

  private actionPatch(
    resource: ProductResource,
    record: Record<string, unknown>,
    action: string,
    data: Record<string, unknown>,
    actorUserId?: string,
  ): Record<string, unknown> {
    const now = new Date();
    switch (resource) {
      case 'dynamic-discounting-offers':
        return dynamicDiscountingAction(record, action, now);
      case 'receivables-facilities':
        return receivablesAction(record, action, data);
      case 'funder-marketplace-bids':
        return marketplaceBidAction(record, action, now);
      case 'esg-scorecards':
        return esgAction(action, now);
      case 'ai-anomaly-signals':
        return anomalyAction(action, now, actorUserId, data);
      case 'investor-report-snapshots':
        return investorReportAction(action, now);
    }
  }
}

function dynamicDiscountingAction(
  record: Record<string, unknown>,
  action: string,
  now: Date,
) {
  const status = String(record.status);
  if (action === 'accept' && ['OFFERED', 'REQUESTED'].includes(status)) {
    return { status: 'ACCEPTED', acceptedAt: now };
  }
  if (action === 'settle' && status === 'ACCEPTED') {
    return { status: 'SETTLED' };
  }
  if (action === 'cancel' && !['SETTLED', 'CANCELLED'].includes(status)) {
    return { status: 'CANCELLED' };
  }
  throw new BadRequestException(`Cannot ${action} dynamic discounting offer from ${status}`);
}

function receivablesAction(
  record: Record<string, unknown>,
  action: string,
  data: Record<string, unknown>,
) {
  const status = String(record.status);
  if (action === 'approve' && status === 'DRAFT') return { status: 'APPROVED' };
  if (action === 'activate' && ['APPROVED', 'SUSPENDED'].includes(status)) {
    return { status: 'ACTIVE' };
  }
  if (action === 'suspend' && status === 'ACTIVE') return { status: 'SUSPENDED' };
  if (action === 'close' && !['CLOSED'].includes(status)) return { status: 'CLOSED' };
  if (action === 'utilise') {
    const amount =
      numberValue(record.utilisedAmount ?? 0) + numberValue(data.amount ?? 0);
    const limit = numberValue(record.facilityLimit);
    if (amount > limit) throw new BadRequestException('Utilisation would exceed facility limit');
    return { utilisedAmount: amount };
  }
  throw new BadRequestException(`Cannot ${action} receivables facility from ${status}`);
}

function marketplaceBidAction(record: Record<string, unknown>, action: string, now: Date) {
  const status = String(record.participationStatus);
  if (action === 'confirm' && status === 'SUBMITTED') {
    const validUntil = record.validUntil instanceof Date ? record.validUntil : record.validUntil ? new Date(String(record.validUntil)) : undefined;
    if (validUntil && validUntil.getTime() < now.getTime()) {
      throw new BadRequestException('Expired bids cannot be confirmed');
    }
    return { participationStatus: 'CONFIRMED', confirmedAt: now };
  }
  if (action === 'allocate' && status === 'CONFIRMED') {
    return { participationStatus: 'ALLOCATED' };
  }
  if (action === 'withdraw' && !['ALLOCATED', 'WITHDRAWN'].includes(status)) {
    return { participationStatus: 'WITHDRAWN' };
  }
  throw new BadRequestException(`Cannot ${action} marketplace bid from ${status}`);
}

function esgAction(action: string, now: Date) {
  if (action === 'review') return { status: 'UNDER_REVIEW' };
  if (action === 'activate') return { status: 'ACTIVE', asOfDate: now };
  if (action === 'expire') return { status: 'EXPIRED' };
  throw new BadRequestException(`Unsupported ESG action: ${action}`);
}

function anomalyAction(
  action: string,
  now: Date,
  actorUserId: string | undefined,
  data: Record<string, unknown>,
) {
  if (action === 'review') return { status: 'UNDER_REVIEW' };
  if (action === 'resolve') {
    return {
      status: 'RESOLVED',
      reviewedAt: now,
      reviewedByUserId: actorUserId,
      rationaleJson: data.rationaleJson as Prisma.InputJsonValue | undefined,
    };
  }
  if (action === 'dismiss') {
    return { status: 'DISMISSED', reviewedAt: now, reviewedByUserId: actorUserId };
  }
  throw new BadRequestException(`Unsupported anomaly action: ${action}`);
}

function investorReportAction(action: string, now: Date) {
  if (action === 'generate') return { status: 'GENERATED', generatedAt: now };
  if (action === 'publish') return { status: 'PUBLISHED' };
  if (action === 'archive') return { status: 'ARCHIVED' };
  throw new BadRequestException(`Unsupported investor report action: ${action}`);
}

function parseJsonField(key: string, value: string) {
  try {
    return JSON.parse(value) as Prisma.InputJsonValue;
  } catch {
    throw new BadRequestException(`${key} must contain valid JSON`);
  }
}

function numberValue(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRate(value: number) {
  return Math.round(value * 10000) / 10000;
}

function esgTier(score: number) {
  if (score >= 80) return 'GREEN';
  if (score >= 60) return 'STANDARD';
  if (score >= 40) return 'WATCHLIST';
  return 'HIGH_RISK';
}

function esgAdjustment(score: number) {
  if (score >= 80) return -25;
  if (score >= 60) return 0;
  if (score >= 40) return 25;
  return 75;
}

function anomalySeverity(score: number) {
  if (score >= 0.9) return 'CRITICAL';
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.5) return 'MEDIUM';
  return 'LOW';
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );
  return [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header])).join(','),
    ),
  ].join('\n');
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'object'
      ? JSON.stringify(value)
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function isDateField(key: string) {
  return (
    key.endsWith('At') ||
    key.endsWith('Date') ||
    key.endsWith('Until') ||
    key === 'expiresAt' ||
    key === 'periodStart' ||
    key === 'periodEnd' ||
    key === 'generatedAt'
  );
}
