export interface InitiatePaymentPayload {
  paymentId: string;
  amount: number;
  currency: string;
  direction: 'OUTBOUND' | 'INBOUND';
  paymentType: string;
  beneficiaryName?: string;
  beneficiaryAccountNumber?: string;
  beneficiaryBankCode?: string;
  beneficiaryMobileNumber?: string;
  reference: string;
  narration?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderResult {
  success: boolean;
  provider: string;
  providerReference?: string;
  externalTransactionId?: string;
  providerStatus: string;
  normalizedStatus:
    'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'RETURNED';
  errorMessage?: string;
  rawResponse?: unknown;
}

export type VerifyPaymentResult = PaymentProviderResult;

export interface PaymentWebhookResult {
  providerReference?: string;
  externalTransactionId?: string;
  providerStatus: string;
  normalizedStatus:
    'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'RETURNED';
  eventReference?: string;
  rawPayload?: unknown;
}

export interface PaymentProvider {
  initiatePayment(
    payload: InitiatePaymentPayload,
  ): Promise<PaymentProviderResult>;
  verifyPayment(providerReference: string): Promise<VerifyPaymentResult>;
  processWebhook(
    payload: unknown,
    signature?: string,
  ): Promise<PaymentWebhookResult>;
}
