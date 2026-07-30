import { ForbiddenException } from '@nestjs/common';
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
    ).toThrow(/Unsafe production/);
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
