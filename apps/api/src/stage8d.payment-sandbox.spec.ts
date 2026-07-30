import { PaymentStatus, Prisma } from '@prisma/client';
import { SandboxPaymentProvider } from './integrations/payments/sandbox-payment.provider';
import { PaymentsService } from './payments/payments.service';

function config(values: Record<string, string | undefined> = {}) {
  return {
    get: jest.fn((key: string) => values[key]),
  };
}

function service(prisma: Record<string, unknown>) {
  const logs = { create: jest.fn().mockResolvedValue({ id: 'log-1' }) };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const notifications = {
    createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  return {
    payments: new PaymentsService(
      prisma as never,
      logs as never,
      audit as never,
      config({ PAYMENT_WEBHOOK_SECRET: 'dev_payment_secret' }) as never,
      notifications as never,
    ),
    logs,
    audit,
    notifications,
  };
}

describe('Stage 8D sandbox payment integration', () => {
  it('maps sandbox success, failure and pending initiation rules', async () => {
    const provider = new SandboxPaymentProvider(
      config({
        SANDBOX_PAYMENT_AUTO_SUCCESS: 'true',
        SANDBOX_PAYMENT_FAILURE_REFERENCE_PREFIX: 'FAIL',
        SANDBOX_PAYMENT_PENDING_REFERENCE_PREFIX: 'PENDING',
      }) as never,
    );

    await expect(
      provider.initiatePayment({
        paymentId: 'payment-success',
        amount: 100,
        currency: 'GHS',
        direction: 'OUTBOUND',
        paymentType: 'OUTBOUND',
        reference: 'PAY-100',
        idempotencyKey: 'idem-success',
      }),
    ).resolves.toMatchObject({
      success: true,
      providerStatus: 'sandbox_success',
    });
    await expect(
      provider.initiatePayment({
        paymentId: 'payment-fail',
        amount: 100,
        currency: 'GHS',
        direction: 'OUTBOUND',
        paymentType: 'OUTBOUND',
        reference: 'FAIL-100',
        idempotencyKey: 'idem-fail',
      }),
    ).resolves.toMatchObject({
      success: false,
      providerStatus: 'sandbox_failed',
    });
    await expect(
      provider.initiatePayment({
        paymentId: 'payment-pending',
        amount: 100,
        currency: 'GHS',
        direction: 'OUTBOUND',
        paymentType: 'OUTBOUND',
        reference: 'PENDING-100',
        idempotencyKey: 'idem-pending',
      }),
    ).resolves.toMatchObject({
      success: true,
      providerStatus: 'sandbox_pending',
    });
  });

  it('does not initiate the same provider payment twice', async () => {
    const payment = {
      id: 'payment-1',
      amount: new Prisma.Decimal('100.00'),
      currency: 'GHS',
      direction: 'OUTBOUND',
      reference: 'PAY-1',
      status: PaymentStatus.SENT,
      providerReference: 'sandbox-PAY-1-existing',
      idempotencyKey: 'idem-existing',
      financingTransactionId: null,
    };
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(payment),
        update: jest.fn(),
      },
    };
    const { payments, logs } = service(prisma);

    const result = await payments.initiateProviderPayment(
      'payment-1',
      'actor-1',
    );

    expect(result).toEqual({ payment, result: { duplicate: true } });
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(logs.create).not.toHaveBeenCalled();
  });

  it('flags invalid webhook signatures without mutating payment status', async () => {
    const prisma = {
      paymentWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        update: jest.fn(),
      },
    };
    const { payments, logs } = service(prisma);

    const result = await payments.processProviderWebhook(
      'sandbox',
      {
        eventReference: 'evt-invalid',
        providerReference: 'sandbox-PAY-1',
        status: 'sandbox_success',
      },
      'wrong-secret',
    );

    expect(result).toMatchObject({ signatureValid: false });
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'payment.webhook',
        status: 'FAILED',
      }),
    );
  });

  it('deduplicates payment webhooks by event reference', async () => {
    const existing = { id: 'event-1', eventReference: 'evt-1' };
    const prisma = {
      paymentWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
      payment: { update: jest.fn() },
    };
    const { payments } = service(prisma);

    const result = await payments.processProviderWebhook('sandbox', {
      eventReference: 'evt-1',
      providerReference: 'sandbox-PAY-1',
      status: 'sandbox_success',
    });

    expect(result).toEqual({ duplicate: true, event: existing });
    expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('posts ledger and reconciliation once when provider confirms payment', async () => {
    const before = {
      id: 'payment-1',
      amount: new Prisma.Decimal('100.00'),
      currency: 'GHS',
      direction: 'OUTBOUND',
      reference: 'PAY-1',
      status: PaymentStatus.INITIATED,
      providerReference: null,
      idempotencyKey: null,
      financingTransactionId: 'financing-1',
    };
    const after = {
      ...before,
      status: PaymentStatus.CONFIRMED,
      provider: 'sandbox',
      providerReference: 'sandbox-PAY-1-confirmed',
      idempotencyKey: 'idem-1',
      providerStatus: 'sandbox_success',
    };
    const tx = {
      reconciliationItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'rec-1' }),
      },
      ledgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
      },
      ledgerAccount: {
        upsert: jest
          .fn()
          .mockResolvedValueOnce({ id: 'account-2100' })
          .mockResolvedValueOnce({ id: 'account-1000' }),
      },
      financingTransaction: {
        update: jest.fn().mockResolvedValue({ id: 'financing-1' }),
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
    const { payments } = service(prisma);

    const result = await payments.initiateProviderPayment(
      'payment-1',
      'actor-1',
    );

    expect(result.payment.status).toBe(PaymentStatus.CONFIRMED);
    expect(JSON.stringify(tx.reconciliationItem.create.mock.calls)).toContain(
      '"paymentId":"payment-1"',
    );
    expect(tx.ledgerEntry.create).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(tx.financingTransaction.update.mock.calls)).toContain(
      '"status":"DISBURSED"',
    );
  });
});
