import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CounterpartyType,
  FinancingStatus,
  InvoiceStatus,
  LedgerEntryType,
  LimitScope,
  ObligationStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EnginesService } from '../engines/engines.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFinancingDto } from './dto/update-financing.dto';

@Injectable()
export class FinancingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engines: EnginesService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.financingTransaction.findMany({
      include: {
        invoice: { include: { buyer: true, supplier: true } },
        programme: true,
        fundingAllocations: { include: { funder: true } },
        payments: true,
        ledgerEntries: { include: { account: true } },
        maturityObligations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.financingTransaction.findUnique({
      where: { id },
      include: {
        invoice: { include: { buyer: true, supplier: true } },
        programme: true,
        fundingAllocations: { include: { funder: true } },
        payments: true,
        ledgerEntries: { include: { account: true } },
        maturityObligations: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Financing transaction not found');
    }
    return transaction;
  }

  async createOfferFromInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { programme: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== InvoiceStatus.APPROVED) {
      throw new BadRequestException(
        'Invoice must be APPROVED before financing',
      );
    }

    const pricing = await this.engines.calculatePricing({
      invoiceAmount: Number(invoice.amount),
      annualRate: Number(invoice.programme.annualDiscountRate),
      offerDate: new Date().toISOString().slice(0, 10),
      invoiceDueDate: invoice.dueDate.toISOString().slice(0, 10),
      platformFeeFlat: Number(invoice.programme.platformFeeFlat),
      platformFeePercent: Number(invoice.programme.platformFeePercent),
    });

    const transaction = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.financingTransaction.create({
        data: {
          invoiceId: invoice.id,
          offerReference: `OFF-${invoice.invoiceNumber}-${Date.now()}`,
          programmeId: invoice.programmeId,
          supplierId: invoice.supplierId,
          buyerId: invoice.buyerId,
          invoiceAmount: moneyString(pricing.invoiceAmount),
          annualRate: pricing.annualRate.toString(),
          referenceRate: invoice.programme.referenceRate,
          spreadRate: invoice.programme.funderSpread,
          daysAccelerated: pricing.daysAccelerated,
          discountAmount: moneyString(pricing.discountAmount),
          platformFee: moneyString(pricing.platformFee),
          arrangementFee: invoice.programme.arrangementFeeFlat,
          servicingFee: moneyString(
            pricing.invoiceAmount *
              Number(invoice.programme.servicingFeePercent),
          ),
          netProceeds: moneyString(pricing.netProceeds),
          buyerObligationAmount: moneyString(pricing.invoiceAmount),
          funderSettlementAmount: moneyString(pricing.invoiceAmount),
          maturityDate: invoice.dueDate,
          settlementDate: new Date(),
          offerExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          status: FinancingStatus.OFFERED,
          allocationRule: 'PROGRAMME_ACTIVE_FUNDERS_EQUAL_SPLIT',
          discountBreakdown: {
            invoiceAmount: pricing.invoiceAmount,
            annualRate: pricing.annualRate,
            daysAccelerated: pricing.daysAccelerated,
            discountAmount: pricing.discountAmount,
          },
          feeBreakdown: {
            platformFee: pricing.platformFee,
            platformFeeFlat: Number(invoice.programme.platformFeeFlat),
            platformFeePercent: Number(invoice.programme.platformFeePercent),
          },
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.OFFERED },
      });
      return offer;
    });

    await this.audit.log({
      action: AuditAction.CALCULATE,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: invoice,
      afterJson: transaction,
    });
    await this.queueWebhookDeliveries(
      'financing.offer_generated',
      'FinancingTransaction',
      transaction.id,
      transaction,
    );

    const row = await this.findOne(transaction.id);
    await this.notifications
      .createLifecycleEmail(
        'financing.offer_generated',
        row.invoice.supplier.contactEmail,
        {
          entityName: row.offerReference ?? row.id,
          actionUrl: `http://localhost:3000/financing/${row.id}`,
          status: row.status,
        },
      )
      .catch(() => undefined);
    return row;
  }

  async update(id: string, dto: UpdateFinancingDto) {
    const before = await this.findOne(id);
    const transaction = await this.prisma.financingTransaction.update({
      where: { id },
      data: {
        ...dto,
        discountBreakdown: dto.discountBreakdown as Prisma.InputJsonValue,
        feeBreakdown: dto.feeBreakdown as Prisma.InputJsonValue,
        maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : undefined,
        settlementDate: dto.settlementDate
          ? new Date(dto.settlementDate)
          : undefined,
        offerExpiresAt: dto.offerExpiresAt
          ? new Date(dto.offerExpiresAt)
          : undefined,
      },
    });
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: before,
      afterJson: transaction,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const before = await this.findOne(id);
    if (
      before.status === FinancingStatus.DISBURSED ||
      before.status === FinancingStatus.COLLECTED ||
      before.status === FinancingStatus.CLOSED
    ) {
      throw new BadRequestException(
        'disbursed, collected or closed financing cannot be deleted; use adjustment workflows',
      );
    }
    const transaction = await this.prisma.$transaction(async (tx) => {
      if (before.status === FinancingStatus.ACCEPTED) {
        await this.releaseCoreLimits(tx, before, 'reserved');
      }
      await tx.invoice.update({
        where: { id: before.invoiceId },
        data: { status: InvoiceStatus.APPROVED },
      });
      return tx.financingTransaction.update({
        where: { id },
        data: {
          status: FinancingStatus.CANCELLED,
          cancellationReason: 'Deleted from financing management',
        },
      });
    });
    await this.audit.log({
      action: AuditAction.DELETE,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: before,
      afterJson: transaction,
      reason: 'Logical delete: financing cancelled',
    });
    return this.findOne(id);
  }

  async accept(id: string) {
    const before = await this.findOne(id);
    if (before.status !== FinancingStatus.OFFERED) {
      throw new BadRequestException('Only OFFERED financing can be accepted');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      await this.reserveCoreLimits(tx, before);
      const accepted = await tx.financingTransaction.update({
        where: { id },
        data: {
          status: FinancingStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });
      await tx.invoice.update({
        where: { id: before.invoiceId },
        data: { status: InvoiceStatus.FINANCEABLE },
      });
      return accepted;
    });

    await this.audit.log({
      action: AuditAction.APPROVE,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: before,
      afterJson: transaction,
      reason: 'Supplier accepted financing offer',
    });
    await this.queueWebhookDeliveries(
      'financing.accepted',
      'FinancingTransaction',
      transaction.id,
      transaction,
    );

    const row = await this.findOne(transaction.id);
    await this.notifications
      .createLifecycleEmail(
        'financing.accepted',
        row.invoice.buyer.contactEmail,
        {
          entityName: row.offerReference ?? row.id,
          status: row.status,
        },
      )
      .catch(() => undefined);
    return row;
  }

  async fund(id: string) {
    const before = await this.findOne(id);
    if (before.status !== FinancingStatus.ACCEPTED) {
      throw new BadRequestException('Only ACCEPTED financing can be funded');
    }

    const funders = await this.prisma.programmeParticipant.findMany({
      where: {
        programmeId: before.programmeId,
        participantType: CounterpartyType.FUNDER,
        isActive: true,
      },
      include: { counterparty: true },
    });
    if (!funders.length) {
      throw new BadRequestException('Programme has no active funders');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const perFunder = Number(before.invoiceAmount) / funders.length;
      await this.utiliseCoreLimits(tx, before);
      for (const funder of funders) {
        await this.utiliseFunderLimit(
          tx,
          before,
          funder.counterpartyId,
          moneyString(perFunder),
        );
        await tx.fundingAllocation.create({
          data: {
            financingTransactionId: id,
            funderId: funder.counterpartyId,
            allocatedAmount: moneyString(perFunder),
            allocationPercent: (1 / funders.length).toString(),
            expectedYield: before.discountAmount,
          },
        });
      }

      await tx.maturityObligation.create({
        data: {
          financingTransactionId: id,
          programmeId: before.programmeId,
          obligorId: before.buyerId,
          currency: before.invoice.currency,
          principalAmount: before.invoiceAmount,
          feeAmount: before.platformFee,
          interestAmount: before.discountAmount,
          outstandingAmount: before.invoiceAmount,
          dueDate: before.maturityDate,
        },
      });

      await tx.payment.create({
        data: {
          financingTransactionId: id,
          counterpartyId: before.supplierId,
          direction: 'OUTBOUND',
          rail: 'GIP',
          currency: before.invoice.currency,
          amount: before.netProceeds,
          reference: `DISB-${id.slice(0, 8)}`,
          status: PaymentStatus.INITIATED,
          valueDate: new Date(),
        },
      });

      await this.postLedgerEntries(tx, id, before.invoice.currency, [
        [
          '1200',
          'Financed receivable asset',
          LedgerEntryType.DEBIT,
          before.invoiceAmount,
        ],
        [
          '2100',
          'Funder payable',
          LedgerEntryType.CREDIT,
          before.invoiceAmount,
        ],
      ]);

      const funded = await tx.financingTransaction.update({
        where: { id },
        data: { status: FinancingStatus.FUNDED, fundedAt: new Date() },
      });
      await this.refreshExposureSnapshots(tx, before);
      return funded;
    });

    await this.audit.log({
      action: AuditAction.ALLOCATE,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: before,
      afterJson: transaction,
    });
    await this.queueWebhookDeliveries(
      'funding.allocated',
      'FinancingTransaction',
      transaction.id,
      transaction,
    );
    return this.findOne(id);
  }

  async disburse(id: string) {
    const before = await this.findOne(id);
    if (before.status !== FinancingStatus.FUNDED) {
      throw new BadRequestException('Only FUNDED financing can be disbursed');
    }
    const transaction = await this.prisma.$transaction(async (tx) => {
      const outboundPayments = await tx.payment.findMany({
        where: { financingTransactionId: id, direction: 'OUTBOUND' },
      });
      if (!outboundPayments.length) {
        throw new BadRequestException('No outbound payment exists to disburse');
      }
      const outboundTotal = outboundPayments.reduce(
        (sum, payment) => sum.plus(payment.amount),
        new Prisma.Decimal(0),
      );
      if (!outboundTotal.equals(before.netProceeds)) {
        throw new BadRequestException(
          'Outbound payment total does not equal net proceeds',
        );
      }
      await tx.payment.updateMany({
        where: { financingTransactionId: id, direction: 'OUTBOUND' },
        data: { status: PaymentStatus.CONFIRMED, confirmedAt: new Date() },
      });
      for (const payment of outboundPayments) {
        await this.createMatchedReconciliationItem(tx, {
          paymentId: payment.id,
          currency: payment.currency,
          amount: payment.amount,
          reference: payment.reference,
          direction: payment.direction,
        });
      }
      await tx.invoice.update({
        where: { id: before.invoiceId },
        data: { status: InvoiceStatus.FINANCED },
      });
      await this.postLedgerEntries(tx, id, before.invoice.currency, [
        [
          '2100',
          'Funder payable cleared to supplier',
          LedgerEntryType.DEBIT,
          before.netProceeds,
        ],
        [
          '1000',
          'Cash disbursed to supplier',
          LedgerEntryType.CREDIT,
          before.netProceeds,
        ],
      ]);
      const disbursed = await tx.financingTransaction.update({
        where: { id },
        data: { status: FinancingStatus.DISBURSED, disbursedAt: new Date() },
      });
      await this.refreshExposureSnapshots(tx, before);
      return disbursed;
    });
    await this.audit.log({
      action: AuditAction.DISBURSE,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: before,
      afterJson: transaction,
    });
    await this.queueWebhookDeliveries(
      'payment.disbursed',
      'FinancingTransaction',
      transaction.id,
      transaction,
    );
    const row = await this.findOne(id);
    await this.notifications
      .createLifecycleEmail(
        'payment.disbursed',
        row.invoice.supplier.contactEmail,
        {
          entityName: row.offerReference ?? row.id,
          status: row.status,
        },
      )
      .catch(() => undefined);
    return row;
  }

  async collect(id: string) {
    const before = await this.findOne(id);
    if (
      before.status !== FinancingStatus.DISBURSED &&
      before.status !== FinancingStatus.MATURED
    ) {
      throw new BadRequestException(
        'Only DISBURSED or MATURED financing can be collected',
      );
    }
    const transaction = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          financingTransactionId: id,
          counterpartyId: before.buyerId,
          direction: 'INBOUND',
          rail: 'GIP',
          currency: before.invoice.currency,
          amount: before.invoiceAmount,
          reference: `COLL-${id.slice(0, 8)}`,
          status: PaymentStatus.CONFIRMED,
          valueDate: new Date(),
          confirmedAt: new Date(),
        },
      });
      await this.createMatchedReconciliationItem(tx, {
        paymentId: payment.id,
        currency: payment.currency,
        amount: payment.amount,
        reference: payment.reference,
        direction: payment.direction,
      });
      const obligation = before.maturityObligations[0];
      if (obligation) {
        if (
          new Prisma.Decimal(before.invoiceAmount).lt(
            obligation.outstandingAmount,
          )
        ) {
          throw new BadRequestException(
            'Collection amount is below outstanding obligation',
          );
        }
        await tx.paymentApplication.create({
          data: {
            paymentId: payment.id,
            obligationId: obligation.id,
            appliedAmount: before.invoiceAmount,
          },
        });
        await tx.maturityObligation.update({
          where: { id: obligation.id },
          data: { status: ObligationStatus.PAID, outstandingAmount: '0' },
        });
      }
      await tx.invoice.update({
        where: { id: before.invoiceId },
        data: { status: InvoiceStatus.SETTLED },
      });
      await this.postLedgerEntries(tx, id, before.invoice.currency, [
        [
          '1000',
          'Cash collected from buyer',
          LedgerEntryType.DEBIT,
          before.invoiceAmount,
        ],
        [
          '1200',
          'Financed receivable settled',
          LedgerEntryType.CREDIT,
          before.invoiceAmount,
        ],
      ]);
      await this.releaseCoreLimits(tx, before, 'utilised');
      await this.releaseFunderLimits(tx, before);
      const collected = await tx.financingTransaction.update({
        where: { id },
        data: { status: FinancingStatus.COLLECTED, collectedAt: new Date() },
      });
      await this.refreshExposureSnapshots(tx, before);
      return collected;
    });
    await this.audit.log({
      action: AuditAction.COLLECT,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: before,
      afterJson: transaction,
    });
    await this.queueWebhookDeliveries(
      'collection.received',
      'FinancingTransaction',
      transaction.id,
      transaction,
    );
    const row = await this.findOne(id);
    await this.notifications
      .createLifecycleEmail(
        'collection.received',
        row.invoice.buyer.contactEmail,
        {
          entityName: row.offerReference ?? row.id,
          status: row.status,
        },
      )
      .catch(() => undefined);
    return row;
  }

  async close(id: string) {
    const before = await this.findOne(id);
    if (before.status !== FinancingStatus.COLLECTED) {
      throw new BadRequestException('Only COLLECTED financing can be closed');
    }
    const transaction = await this.prisma.$transaction(async (tx) => {
      const openObligations = await tx.maturityObligation.count({
        where: {
          financingTransactionId: id,
          status: {
            in: [
              ObligationStatus.OPEN,
              ObligationStatus.PARTIALLY_PAID,
              ObligationStatus.PAST_DUE,
              ObligationStatus.DEFAULTED,
            ],
          },
        },
      });
      if (openObligations > 0) {
        throw new BadRequestException(
          'Cannot close financing with open obligations',
        );
      }
      const closed = await tx.financingTransaction.update({
        where: { id },
        data: { status: FinancingStatus.CLOSED },
      });
      await this.refreshExposureSnapshots(tx, before);
      return closed;
    });
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'FinancingTransaction',
      entityId: transaction.id,
      beforeJson: before,
      afterJson: transaction,
      reason: 'Financing closed',
    });
    return this.findOne(id);
  }

  private async postLedgerEntries(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    financingTransactionId: string,
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
          financingTransactionId,
          entryType,
          amount: String(amount),
          currency,
          description: name,
        },
      });
    }
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

  private assertBalancedLedger(
    entries: [string, string, LedgerEntryType, unknown][],
  ) {
    const totals = entries.reduce(
      (acc, [, , entryType, amount]) => {
        const value = new Prisma.Decimal(String(amount));
        if (entryType === LedgerEntryType.DEBIT) {
          acc.debits = acc.debits.plus(value);
        } else {
          acc.credits = acc.credits.plus(value);
        }
        return acc;
      },
      { debits: new Prisma.Decimal(0), credits: new Prisma.Decimal(0) },
    );
    if (!totals.debits.equals(totals.credits)) {
      throw new BadRequestException(
        `Ledger posting is not balanced: debits ${totals.debits.toFixed(2)}, credits ${totals.credits.toFixed(2)}`,
      );
    }
  }

  private async reserveCoreLimits(
    tx: Prisma.TransactionClient,
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
  ) {
    await this.ensureConfiguredCoreLimits(tx, transaction);
    for (const dimension of this.coreLimitDimensions(transaction)) {
      await this.moveLimitAmount(tx, dimension, transaction.invoiceAmount, {
        reservedDelta: transaction.invoiceAmount,
        requireAvailability: true,
      });
    }
    await this.refreshExposureSnapshots(tx, transaction);
  }

  private async utiliseCoreLimits(
    tx: Prisma.TransactionClient,
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
  ) {
    for (const dimension of this.coreLimitDimensions(transaction)) {
      await this.moveLimitAmount(tx, dimension, transaction.invoiceAmount, {
        reservedDelta: new Prisma.Decimal(transaction.invoiceAmount).negated(),
        utilisedDelta: transaction.invoiceAmount,
      });
    }
  }

  private async releaseCoreLimits(
    tx: Prisma.TransactionClient,
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
    bucket: 'reserved' | 'utilised',
  ) {
    for (const dimension of this.coreLimitDimensions(transaction)) {
      await this.moveLimitAmount(tx, dimension, transaction.invoiceAmount, {
        reservedDelta:
          bucket === 'reserved'
            ? new Prisma.Decimal(transaction.invoiceAmount).negated()
            : undefined,
        utilisedDelta:
          bucket === 'utilised'
            ? new Prisma.Decimal(transaction.invoiceAmount).negated()
            : undefined,
      });
    }
  }

  private async utiliseFunderLimit(
    tx: Prisma.TransactionClient,
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
    funderId: string,
    amount: string,
  ) {
    await this.ensureConfiguredLimit(tx, {
      scope: LimitScope.FUNDER,
      programmeId: transaction.programmeId,
      counterpartyId: funderId,
      currency: transaction.invoice.currency,
      limitAmount: transaction.programme.funderLimit,
    });
    await this.moveLimitAmount(
      tx,
      {
        scope: LimitScope.FUNDER,
        programmeId: transaction.programmeId,
        counterpartyId: funderId,
        currency: transaction.invoice.currency,
      },
      amount,
      { utilisedDelta: amount, requireAvailability: true },
    );
  }

  private async releaseFunderLimits(
    tx: Prisma.TransactionClient,
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
  ) {
    for (const allocation of transaction.fundingAllocations) {
      await this.moveLimitAmount(
        tx,
        {
          scope: LimitScope.FUNDER,
          programmeId: transaction.programmeId,
          counterpartyId: allocation.funderId,
          currency: transaction.invoice.currency,
        },
        allocation.allocatedAmount,
        {
          utilisedDelta: new Prisma.Decimal(
            allocation.allocatedAmount,
          ).negated(),
        },
      );
    }
  }

  private async ensureConfiguredCoreLimits(
    tx: Prisma.TransactionClient,
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
  ) {
    await this.ensureConfiguredLimit(tx, {
      scope: LimitScope.PROGRAMME,
      programmeId: transaction.programmeId,
      currency: transaction.invoice.currency,
      limitAmount: transaction.programme.programmeLimit,
    });
    await this.ensureConfiguredLimit(tx, {
      scope: LimitScope.ANCHOR,
      programmeId: transaction.programmeId,
      counterpartyId: transaction.buyerId,
      currency: transaction.invoice.currency,
      limitAmount: transaction.programme.anchorLimit,
    });
    await this.ensureConfiguredLimit(tx, {
      scope: LimitScope.SUPPLIER,
      programmeId: transaction.programmeId,
      counterpartyId: transaction.supplierId,
      currency: transaction.invoice.currency,
      limitAmount: transaction.programme.supplierLimit,
    });
  }

  private async ensureConfiguredLimit(
    tx: Prisma.TransactionClient,
    input: {
      scope: LimitScope;
      programmeId: string;
      counterpartyId?: string;
      currency: string;
      limitAmount?: Prisma.Decimal | null;
    },
  ) {
    if (!input.limitAmount) {
      return;
    }
    const existing = await tx.limitRecord.findFirst({
      where: {
        scope: input.scope,
        programmeId: input.programmeId,
        counterpartyId: input.counterpartyId ?? null,
        currency: input.currency,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (existing) {
      return;
    }
    await tx.limitRecord.create({
      data: {
        scope: input.scope,
        programmeId: input.programmeId,
        counterpartyId: input.counterpartyId,
        currency: input.currency,
        limitAmount: input.limitAmount,
        availableAmount: input.limitAmount,
        covenantJson: {
          source: 'programme_configuration',
          autoCreated: true,
        },
      },
    });
  }

  private coreLimitDimensions(
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
  ) {
    return [
      {
        scope: LimitScope.PROGRAMME,
        programmeId: transaction.programmeId,
        currency: transaction.invoice.currency,
      },
      {
        scope: LimitScope.ANCHOR,
        programmeId: transaction.programmeId,
        counterpartyId: transaction.buyerId,
        currency: transaction.invoice.currency,
      },
      {
        scope: LimitScope.SUPPLIER,
        programmeId: transaction.programmeId,
        counterpartyId: transaction.supplierId,
        currency: transaction.invoice.currency,
      },
    ];
  }

  private async moveLimitAmount(
    tx: Prisma.TransactionClient,
    dimension: {
      scope: LimitScope;
      programmeId: string;
      counterpartyId?: string;
      currency: string;
    },
    amount: Prisma.Decimal | string,
    movement: {
      reservedDelta?: Prisma.Decimal | string;
      utilisedDelta?: Prisma.Decimal | string;
      requireAvailability?: boolean;
    },
  ) {
    const limit = await tx.limitRecord.findFirst({
      where: {
        scope: dimension.scope,
        programmeId: dimension.programmeId,
        counterpartyId: dimension.counterpartyId ?? null,
        currency: dimension.currency,
        status: 'ACTIVE',
        effectiveFrom: { lte: new Date() },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!limit) {
      return;
    }

    const requested = new Prisma.Decimal(amount);
    const reservedDelta = movement.reservedDelta
      ? new Prisma.Decimal(movement.reservedDelta)
      : new Prisma.Decimal(0);
    const utilisedDelta = movement.utilisedDelta
      ? new Prisma.Decimal(movement.utilisedDelta)
      : new Prisma.Decimal(0);
    const currentReserved = new Prisma.Decimal(limit.reservedAmount);
    const currentUtilised = new Prisma.Decimal(limit.utilisedAmount);
    const available = new Prisma.Decimal(limit.limitAmount)
      .minus(currentReserved)
      .minus(currentUtilised);

    if (movement.requireAvailability && available.lt(requested)) {
      throw new BadRequestException(
        `${dimension.scope} limit breached. Required ${requested.toFixed(2)} ${dimension.currency}, available ${available.toFixed(2)} ${dimension.currency}`,
      );
    }

    const nextReserved = decimalMax(
      new Prisma.Decimal(0),
      currentReserved.plus(reservedDelta),
    );
    const nextUtilised = decimalMax(
      new Prisma.Decimal(0),
      currentUtilised.plus(utilisedDelta),
    );
    const nextAvailable = decimalMax(
      new Prisma.Decimal(0),
      new Prisma.Decimal(limit.limitAmount)
        .minus(nextReserved)
        .minus(nextUtilised),
    );

    await tx.limitRecord.update({
      where: { id: limit.id },
      data: {
        reservedAmount: nextReserved,
        utilisedAmount: nextUtilised,
        availableAmount: nextAvailable,
      },
    });
  }

  private async refreshExposureSnapshots(
    tx: Prisma.TransactionClient,
    transaction: Awaited<ReturnType<FinancingService['findOne']>>,
  ) {
    for (const dimension of this.coreLimitDimensions(transaction)) {
      await this.writeExposureSnapshot(tx, dimension);
    }
    for (const allocation of transaction.fundingAllocations) {
      await this.writeExposureSnapshot(tx, {
        scope: LimitScope.FUNDER,
        programmeId: transaction.programmeId,
        counterpartyId: allocation.funderId,
        currency: transaction.invoice.currency,
      });
    }
  }

  private async writeExposureSnapshot(
    tx: Prisma.TransactionClient,
    dimension: {
      scope: LimitScope;
      programmeId: string;
      counterpartyId?: string;
      currency: string;
    },
  ) {
    const exposureAmount =
      dimension.scope === LimitScope.FUNDER
        ? await this.funderExposureAmount(tx, dimension)
        : await this.transactionExposureAmount(tx, dimension);
    const limit = await tx.limitRecord.findFirst({
      where: {
        scope: dimension.scope,
        programmeId: dimension.programmeId,
        counterpartyId: dimension.counterpartyId ?? null,
        currency: dimension.currency,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
    await tx.exposureSnapshot.create({
      data: {
        scope: dimension.scope,
        programmeId: dimension.programmeId,
        counterpartyId: dimension.counterpartyId,
        currency: dimension.currency,
        exposureAmount,
        availableLimit: limit?.availableAmount,
        sourceJson: {
          source: 'financing_lifecycle',
          statuses: ['ACCEPTED', 'FUNDED', 'DISBURSED', 'MATURED'],
        },
      },
    });
  }

  private async transactionExposureAmount(
    tx: Prisma.TransactionClient,
    dimension: {
      scope: LimitScope;
      programmeId: string;
      counterpartyId?: string;
    },
  ) {
    const exposure = await tx.financingTransaction.aggregate({
      where: this.exposureWhere(dimension),
      _sum: { invoiceAmount: true },
    });
    return exposure._sum.invoiceAmount ?? 0;
  }

  private async funderExposureAmount(
    tx: Prisma.TransactionClient,
    dimension: {
      programmeId: string;
      counterpartyId?: string;
    },
  ) {
    const exposure = await tx.fundingAllocation.aggregate({
      where: {
        funderId: dimension.counterpartyId,
        financingTransaction: {
          programmeId: dimension.programmeId,
          status: {
            in: [
              FinancingStatus.FUNDED,
              FinancingStatus.DISBURSED,
              FinancingStatus.MATURED,
            ],
          },
        },
      },
      _sum: { allocatedAmount: true },
    });
    return exposure._sum.allocatedAmount ?? 0;
  }

  private exposureWhere(dimension: {
    scope: LimitScope;
    programmeId: string;
    counterpartyId?: string;
  }): Prisma.FinancingTransactionWhereInput {
    const base: Prisma.FinancingTransactionWhereInput = {
      programmeId: dimension.programmeId,
      status: {
        in: [
          FinancingStatus.ACCEPTED,
          FinancingStatus.FUNDED,
          FinancingStatus.DISBURSED,
          FinancingStatus.MATURED,
        ],
      },
    };
    if (dimension.scope === LimitScope.ANCHOR) {
      return { ...base, buyerId: dimension.counterpartyId };
    }
    if (dimension.scope === LimitScope.SUPPLIER) {
      return { ...base, supplierId: dimension.counterpartyId };
    }
    if (dimension.scope === LimitScope.FUNDER) {
      return {
        ...base,
        fundingAllocations: {
          some: { funderId: dimension.counterpartyId },
        },
      };
    }
    return base;
  }

  private async createMatchedReconciliationItem(
    tx: Prisma.TransactionClient,
    input: {
      paymentId: string;
      currency: string;
      amount: Prisma.Decimal;
      reference?: string | null;
      direction: string;
    },
  ) {
    await tx.reconciliationItem.create({
      data: {
        paymentId: input.paymentId,
        statementReference: input.reference,
        currency: input.currency,
        statementAmount:
          input.direction === 'OUTBOUND'
            ? new Prisma.Decimal(input.amount).negated()
            : input.amount,
        statementDate: new Date(),
        status: 'MATCHED',
        matchConfidence: '1',
        investigationNotes: 'Auto-matched from confirmed platform payment.',
      },
    });
  }
}

function moneyString(value: number): string {
  return value.toFixed(2);
}

function decimalMax(
  first: Prisma.Decimal,
  second: Prisma.Decimal,
): Prisma.Decimal {
  return first.greaterThan(second) ? first : second;
}
