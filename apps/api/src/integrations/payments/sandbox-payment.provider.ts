import { ConfigService } from '@nestjs/config';
import {
  InitiatePaymentPayload,
  PaymentProvider,
  PaymentProviderResult,
  PaymentWebhookResult,
  VerifyPaymentResult,
} from './payment-provider.interface';

export class SandboxPaymentProvider implements PaymentProvider {
  private readonly autoSuccess: boolean;
  private readonly failPrefix: string;
  private readonly pendingPrefix: string;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    this.autoSuccess =
      config.get<string>('SANDBOX_PAYMENT_AUTO_SUCCESS') !== 'false';
    this.failPrefix =
      config.get<string>('SANDBOX_PAYMENT_FAILURE_REFERENCE_PREFIX') ?? 'FAIL';
    this.pendingPrefix =
      config.get<string>('SANDBOX_PAYMENT_PENDING_REFERENCE_PREFIX') ??
      'PENDING';
    this.webhookSecret =
      config.get<string>('PAYMENT_WEBHOOK_SECRET') ?? 'dev_payment_secret';
  }

  initiatePayment(
    payload: InitiatePaymentPayload,
  ): Promise<PaymentProviderResult> {
    const base = this.references(payload.reference, payload.idempotencyKey);
    if (payload.amount <= 0) {
      return Promise.resolve(
        this.result(
          false,
          'sandbox_failed',
          'FAILED',
          base,
          'Payment amount must be positive',
        ),
      );
    }
    if (payload.reference.startsWith(this.failPrefix)) {
      return Promise.resolve(
        this.result(
          false,
          'sandbox_failed',
          'FAILED',
          base,
          'Reference forced sandbox failure',
        ),
      );
    }
    if (payload.reference.startsWith(this.pendingPrefix)) {
      return Promise.resolve(
        this.result(true, 'sandbox_pending', 'PENDING', base),
      );
    }
    return Promise.resolve(
      this.result(
        true,
        this.autoSuccess ? 'sandbox_success' : 'sandbox_initiated',
        this.autoSuccess ? 'CONFIRMED' : 'INITIATED',
        base,
      ),
    );
  }

  verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    if (providerReference.includes('FAIL')) {
      return Promise.resolve(
        this.result(
          false,
          'sandbox_failed',
          'FAILED',
          {
            providerReference,
            externalTransactionId: `ext-${providerReference}`,
          },
          'Sandbox verification failure',
        ),
      );
    }
    if (providerReference.includes('PENDING')) {
      return Promise.resolve(
        this.result(true, 'sandbox_pending', 'PENDING', {
          providerReference,
          externalTransactionId: `ext-${providerReference}`,
        }),
      );
    }
    return Promise.resolve(
      this.result(true, 'sandbox_success', 'CONFIRMED', {
        providerReference,
        externalTransactionId: `ext-${providerReference}`,
      }),
    );
  }

  processWebhook(
    payload: unknown,
    signature?: string,
  ): Promise<PaymentWebhookResult> {
    const data =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    if (signature && signature !== this.webhookSecret) {
      return Promise.resolve({
        providerStatus: 'sandbox_failed',
        normalizedStatus: 'FAILED',
        eventReference: stringValue(
          data.eventReference,
          data.id,
          `invalid-${Date.now()}`,
        ),
        rawPayload: payload,
      });
    }
    const status = stringValue(
      data.status,
      data.providerStatus,
      'sandbox_success',
    );
    return Promise.resolve({
      providerReference:
        typeof data.providerReference === 'string'
          ? data.providerReference
          : undefined,
      externalTransactionId:
        typeof data.externalTransactionId === 'string'
          ? data.externalTransactionId
          : undefined,
      providerStatus: status,
      normalizedStatus:
        status === 'sandbox_failed'
          ? 'FAILED'
          : status === 'sandbox_returned'
            ? 'RETURNED'
            : status === 'sandbox_pending'
              ? 'PENDING'
              : 'CONFIRMED',
      eventReference: stringValue(
        data.eventReference,
        data.id,
        `sandbox-webhook-${Date.now()}`,
      ),
      rawPayload: payload,
    });
  }

  private references(reference: string, idempotencyKey: string) {
    return {
      providerReference: `sandbox-${reference}-${idempotencyKey.slice(0, 8)}`,
      externalTransactionId: `ext-${reference}-${Date.now()}`,
    };
  }

  private result(
    success: boolean,
    providerStatus: string,
    normalizedStatus: PaymentProviderResult['normalizedStatus'],
    refs: { providerReference?: string; externalTransactionId?: string },
    errorMessage?: string,
  ): PaymentProviderResult {
    return {
      success,
      provider: 'sandbox',
      providerReference: refs.providerReference,
      externalTransactionId: refs.externalTransactionId,
      providerStatus,
      normalizedStatus,
      errorMessage,
      rawResponse: { providerStatus, normalizedStatus, errorMessage },
    };
  }
}

function stringValue(value: unknown, fallback: unknown, defaultValue: string) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof fallback === 'string' || typeof fallback === 'number') {
    return String(fallback);
  }
  return defaultValue;
}
