import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';

function buildService() {
  const rows = {
    offer: {
      id: 'offer-1',
      buyerId: 'buyer-1',
      supplierId: 'supplier-1',
      invoiceAmount: 100,
      discountAmount: 5,
      netPaymentAmount: 95,
      status: 'OFFERED',
      updatedAt: new Date(),
    },
    facility: { id: 'facility-1', supplierId: 'supplier-1' },
  };
  const aggregate = jest.fn().mockResolvedValue({
    _sum: {
      invoiceAmount: 100,
      discountAmount: 5,
      netPaymentAmount: 95,
      facilityLimit: 200,
      utilisedAmount: 50,
      offeredAmount: 75,
      navAmount: 300,
      committedCapital: 400,
      drawnCapital: 250,
    },
  });
  const prisma = {
    dynamicDiscountingOffer: {
      count: jest.fn().mockResolvedValue(1),
      aggregate,
      findMany: jest.fn().mockResolvedValue([rows.offer]),
      findUniqueOrThrow: jest.fn().mockResolvedValue(rows.offer),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'offer-1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'offer-1', ...data })),
      delete: jest.fn().mockResolvedValue(rows.offer),
    },
    receivablesFacility: {
      count: jest.fn().mockResolvedValue(1),
      aggregate,
      findMany: jest.fn().mockResolvedValue([rows.facility]),
      findUniqueOrThrow: jest.fn().mockResolvedValue(rows.facility),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    funderMarketplaceBid: {
      count: jest.fn().mockResolvedValue(1),
      aggregate,
      findMany: jest.fn().mockResolvedValue([]),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    esgScorecard: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    aiAnomalySignal: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    investorReportSnapshot: {
      count: jest.fn().mockResolvedValue(1),
      aggregate,
      findMany: jest.fn().mockResolvedValue([]),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'snapshot-1', ...data })),
      update: jest.fn(),
      delete: jest.fn(),
    },
    approvalRequest: {
      create: jest.fn().mockResolvedValue({
        id: 'approval-1',
        entityType: 'Product:dynamic-discounting-offers',
        entityId: 'offer-1',
        action: 'PRODUCT_ACTION',
        status: 'PENDING',
      }),
    },
    auditLog: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    programme: {
      findUnique: jest.fn().mockResolvedValue({ id: 'programme-1' }),
    },
    invoice: {
      findUnique: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
    },
    payment: {
      findUnique: jest.fn().mockResolvedValue({ id: 'payment-1' }),
    },
    financingTransaction: {
      findUnique: jest.fn().mockResolvedValue({ id: 'financing-1' }),
    },
    counterparty: {
      findUnique: jest.fn().mockResolvedValue({ id: 'counterparty-1' }),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  return {
    service: new ProductsService(prisma as never, audit as never),
    prisma,
    audit,
  };
}

describe('ProductsService', () => {
  it('returns product dashboard metrics and totals', async () => {
    const { service } = buildService();

    await expect(service.dashboard()).resolves.toMatchObject({
      openDynamicDiscountingOffers: 1,
      activeReceivablesFacilities: 1,
      openAiAnomalySignals: 1,
      dynamicDiscountingInvoiceAmount: 100,
      receivablesFacilityLimit: 200,
      investorNavAmount: 300,
    });
  });

  it('creates dynamic discounting records and normalizes date fields', async () => {
    const { service, prisma, audit } = buildService();

    const record = await service.create(
      'dynamic-discounting-offers',
      {
        buyerId: 'buyer-1',
        supplierId: 'supplier-1',
        invoiceAmount: 100,
        discountModel: 'STATIC_RATE',
        discountRate: 2,
        discountAmount: 2,
        netPaymentAmount: 98,
        daysAccelerated: 10,
        expiresAt: '2026-08-01T00:00:00.000Z',
        requestedBy: '',
      },
      'user-1',
    );

    expect(record).toHaveProperty('id', 'offer-1');
    expect(
      prisma.dynamicDiscountingOffer.create.mock.calls[0][0].data.expiresAt,
    ).toBeInstanceOf(Date);
    expect(
      prisma.dynamicDiscountingOffer.create.mock.calls[0][0].data,
    ).not.toHaveProperty('requestedBy');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        action: 'CREATE',
        entityType: 'Product:dynamic-discounting-offers',
        entityId: 'offer-1',
      }),
    );
  });

  it('creates investor report snapshots and parses JSON text fields', async () => {
    const { service, prisma } = buildService();

    const record = await service.create(
      'investor-report-snapshots',
      {
        counterpartyId: '',
        reportType: 'MONTHLY_NAV',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T00:00:00.000Z',
        navAmount: 1000,
        committedCapital: 1500,
        drawnCapital: 900,
        distributedCapital: 50,
        grossYield: 0.12,
        delinquencyRate: 0.01,
        weightedAverageLifeDays: 45,
        reportJson: '{"nav":1000,"currency":"GHS"}',
        status: 'GENERATED',
        generatedAt: '2026-08-31T12:00:00.000Z',
      },
      'user-1',
    );

    expect(record).toHaveProperty('id', 'snapshot-1');
    expect(prisma.investorReportSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reportJson: { nav: 1000, currency: 'GHS' },
          periodStart: expect.any(Date),
          generatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects invalid product JSON fields with a validation error', async () => {
    const { service, prisma } = buildService();

    await expect(
      service.create('investor-report-snapshots', {
        reportType: 'MONTHLY_NAV',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T00:00:00.000Z',
        reportJson: '{not-json',
        status: 'GENERATED',
      }),
    ).rejects.toThrow('reportJson must contain valid JSON');
    expect(prisma.investorReportSnapshot.create).not.toHaveBeenCalled();
  });

  it('updates and deletes supported resources with audit logs', async () => {
    const { service, audit } = buildService();

    await service.update(
      'dynamic-discounting-offers',
      'offer-1',
      { status: 'ACCEPTED', acceptedAt: '2026-08-02T00:00:00.000Z' },
      'user-1',
    );
    await service.remove('dynamic-discounting-offers', 'offer-1', 'user-1');

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityType: 'Product:dynamic-discounting-offers',
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        entityType: 'Product:dynamic-discounting-offers',
      }),
    );
  });

  it('runs lifecycle actions through explicit transitions', async () => {
    const { service, prisma, audit } = buildService();
    prisma.dynamicDiscountingOffer.findUniqueOrThrow.mockResolvedValue({
      id: 'offer-1',
      status: 'OFFERED',
    });

    const row = await service.action(
      'dynamic-discounting-offers',
      'offer-1',
      'accept',
      {},
      'user-1',
    );

    expect(row).toMatchObject({ id: 'offer-1', status: 'ACCEPTED' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Product action: accept',
      }),
    );
  });

  it('creates maker-checker approval for high-value product actions', async () => {
    const { service, prisma, audit } = buildService();
    prisma.dynamicDiscountingOffer.findUniqueOrThrow.mockResolvedValue({
      id: 'offer-1',
      status: 'OFFERED',
      invoiceAmount: 50000,
      discountAmount: 500,
      netPaymentAmount: 49500,
    });

    const result = await service.action(
      'dynamic-discounting-offers',
      'offer-1',
      'accept',
      {},
      'requester-1',
      'idem-approval-1',
    );

    expect(result).toMatchObject({
      approvalRequired: true,
      approval: { id: 'approval-1' },
    });
    expect(prisma.approvalRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'Product:dynamic-discounting-offers',
          entityId: 'offer-1',
          action: 'PRODUCT_ACTION',
          requestedById: 'requester-1',
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ApprovalRequest',
        reason: 'Product maker-checker required for accept',
      }),
    );
  });

  it('rejects invalid product financial values', async () => {
    const { service } = buildService();

    await expect(
      service.create('dynamic-discounting-offers', {
        buyerId: 'buyer-1',
        supplierId: 'supplier-1',
        invoiceAmount: 100,
        discountModel: 'STATIC_RATE',
        discountRate: 2,
        discountAmount: 101,
        netPaymentAmount: -1,
        daysAccelerated: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported resources', async () => {
    const { service } = buildService();

    expect(() => service.findAll('not-a-resource')).toThrow(
      BadRequestException,
    );
  });

  it('rejects product records with missing linked counterparties', async () => {
    const { service, prisma } = buildService();
    prisma.counterparty.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create('dynamic-discounting-offers', {
        buyerId: 'missing-buyer',
        supplierId: 'supplier-1',
        invoiceAmount: 100,
        discountModel: 'STATIC_RATE',
        discountRate: 2,
        discountAmount: 2,
        netPaymentAmount: 98,
        daysAccelerated: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dynamicDiscountingOffer.create).not.toHaveBeenCalled();
  });

  it('does not repeat lifecycle impact for duplicate idempotency keys', async () => {
    const { service, prisma } = buildService();
    prisma.auditLog.findFirst.mockResolvedValueOnce({ id: 'audit-duplicate-1' });
    prisma.dynamicDiscountingOffer.findUniqueOrThrow.mockResolvedValue({
      id: 'offer-1',
      status: 'ACCEPTED',
    });

    const result = await service.action(
      'dynamic-discounting-offers',
      'offer-1',
      'settle',
      {},
      'user-1',
      'idem-1',
    );

    expect(result).toMatchObject({
      duplicate: true,
      auditLogId: 'audit-duplicate-1',
      record: { id: 'offer-1', status: 'ACCEPTED' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects expired marketplace bids before confirmation', async () => {
    const { service, prisma } = buildService();
    prisma.funderMarketplaceBid.findUniqueOrThrow.mockResolvedValue({
      id: 'bid-1',
      participationStatus: 'SUBMITTED',
      validUntil: new Date(Date.now() - 60_000),
    });

    await expect(
      service.action('funder-marketplace-bids', 'bid-1', 'confirm', {}, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.funderMarketplaceBid.update).not.toHaveBeenCalled();
  });
});
