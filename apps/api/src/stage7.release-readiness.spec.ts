import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { ApprovalsService } from './approvals/approvals.service';
import { validateEnvironment } from './config/env.validation';
import { maskSensitive } from './integrations/integration-log.service';
import { PaymentsService } from './payments/payments.service';

describe('Stage 7 release readiness controls', () => {
  it('rejects unsafe production JWT defaults during environment validation', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'production',
        DATABASE_URL: 'postgresql://example',
        JWT_SECRET: 'change_this_in_dev',
        APP_PORT: '3001',
        PRICING_ENGINE_URL: 'http://pricing',
        CREDIT_ENGINE_URL: 'http://credit',
        FUNDING_ENGINE_URL: 'http://funding',
        REDIS_HOST: 'redis',
        REDIS_PORT: '6379',
      }),
    ).toThrow(/JWT_SECRET|Unsafe production/);
  });

  it('allows production startup only with strong secrets and explicit CORS origins', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'production',
        DATABASE_URL: 'postgresql://example',
        JWT_SECRET: 'prod_jwt_secret_32_chars_minimum_value',
        PAYMENT_WEBHOOK_SECRET: 'prod_payment_secret_32_chars_min',
        ERP_WEBHOOK_SECRET: 'prod_erp_secret_32_chars_minimum',
        EINVOICING_WEBHOOK_SECRET: 'prod_einvoice_secret_32_chars_min',
        CORS_ORIGINS: 'https://app.invox.local',
        APP_PORT: '3001',
        PRICING_ENGINE_URL: 'http://pricing',
        CREDIT_ENGINE_URL: 'http://credit',
        FUNDING_ENGINE_URL: 'http://funding',
        REDIS_HOST: 'redis',
        REDIS_PORT: '6379',
      }),
    ).not.toThrow();
  });

  it('masks credentials and tokens in integration logs', () => {
    expect(
      maskSensitive({
        apiKey: 'visible-bad',
        nested: { accessToken: 'token-bad', safe: 'ok' },
      }),
    ).toEqual({
      apiKey: '[MASKED]',
      nested: { accessToken: '[MASKED]', safe: 'ok' },
    });
  });

  it('enforces maker-checker self-approval rejection', async () => {
    const prisma = {
      approvalRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'approval-1',
          entityType: 'Invoice',
          entityId: 'invoice-1',
          action: 'APPROVE_INVOICE',
          status: 'PENDING',
          requestedById: 'user-1',
        }),
      },
    };
    const service = new ApprovalsService(
      prisma as never,
      { log: jest.fn() } as never,
      { createLifecycleEmail: jest.fn() } as never,
    );

    await expect(
      service.approve(
        'approval-1',
        {},
        { id: 'user-1', email: 'a@b.com', roles: [], permissions: [] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('executes approved product lifecycle approval with maker-checker separation', async () => {
    const approval = {
      id: 'approval-1',
      entityType: 'Product:dynamic-discounting-offers',
      entityId: 'offer-1',
      action: 'PRODUCT_ACTION',
      status: 'PENDING',
      requestedById: 'requester-1',
      requestPayload: {
        resource: 'dynamic-discounting-offers',
        action: 'accept',
      },
    };
    const tx = {
      dynamicDiscountingOffer: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'offer-1',
          currency: 'GHS',
          discountAmount: '10',
        }),
        update: jest.fn().mockResolvedValue({
          id: 'offer-1',
          status: 'ACCEPTED',
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      approvalRequest: {
        findUnique: jest.fn().mockResolvedValue(approval),
        update: jest.fn().mockResolvedValue({
          ...approval,
          status: 'APPROVED',
          approvedById: 'approver-1',
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'requester@test.local' }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const notifications = {
      createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notice-1' }),
    };
    const service = new ApprovalsService(
      prisma as never,
      audit as never,
      notifications as never,
    );

    const result = await service.approve(
      'approval-1',
      { comment: 'approved' },
      {
        id: 'approver-1',
        email: 'approver@test.local',
        roles: [],
        permissions: [],
      },
    );

    expect(result).toMatchObject({
      approval: { status: 'APPROVED' },
      result: { status: 'ACCEPTED' },
    });
    expect(tx.dynamicDiscountingOffer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'approver-1',
        action: 'APPROVE',
        entityType: 'ApprovalRequest',
      }),
    );
  });

  it('rejects invalid product approval payloads', async () => {
    const approval = {
      id: 'approval-1',
      entityType: 'Product:dynamic-discounting-offers',
      entityId: 'offer-1',
      action: 'PRODUCT_ACTION',
      status: 'PENDING',
      requestedById: 'requester-1',
      requestPayload: { action: 'accept' },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: unknown) => Promise<unknown>) =>
        callback({}),
      ),
      approvalRequest: {
        findUnique: jest.fn().mockResolvedValue(approval),
        update: jest.fn(),
      },
    };
    const service = new ApprovalsService(
      prisma as never,
      { log: jest.fn() } as never,
      { createLifecycleEmail: jest.fn() } as never,
    );

    await expect(
      service.approve(
        'approval-1',
        {},
        {
          id: 'approver-1',
          email: 'approver@test.local',
          roles: [],
          permissions: [],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.approvalRequest.update).not.toHaveBeenCalled();
  });

  it('updates payment status and writes integration/audit logs for mock provider verification', async () => {
    const before = {
      id: 'payment-1',
      reference: 'PAY-1',
      amount: '100.00',
      currency: 'GHS',
      direction: 'OUTBOUND',
      financingTransactionId: null,
      providerReference: 'sandbox-PAY-1-test',
      status: PaymentStatus.SENT,
    };
    const after = {
      ...before,
      status: PaymentStatus.CONFIRMED,
      confirmedAt: new Date(),
    };
    const tx = {
      reconciliationItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rec-1' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      payment: {
        findUnique: jest.fn().mockResolvedValue(before),
        update: jest.fn().mockResolvedValue(after),
      },
    };
    const logs = { create: jest.fn().mockResolvedValue({ id: 'log-1' }) };
    const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const notifications = {
      createLifecycleEmail: jest
        .fn()
        .mockResolvedValue({ id: 'notification-1' }),
    };
    const service = new PaymentsService(
      prisma as never,
      logs as never,
      audit as never,
      config as never,
      notifications as never,
    );

    const result = await service.verifyProviderPayment('payment-1', 'actor-1');

    expect(result.payment.status).toBe(PaymentStatus.CONFIRMED);
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: 'PAYMENT',
        operation: 'payment.verify',
        status: 'SUCCESS',
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'actor-1',
        entityType: 'Payment',
        entityId: 'payment-1',
      }),
    );
  });
});
