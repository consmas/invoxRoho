import { PaymentStatus } from '@prisma/client';

export function mapProviderStatus(status: string): PaymentStatus {
  switch (status) {
    case 'sandbox_success':
      return PaymentStatus.CONFIRMED;
    case 'sandbox_failed':
      return PaymentStatus.FAILED;
    case 'sandbox_returned':
      return PaymentStatus.RETURNED;
    case 'sandbox_pending':
    case 'sandbox_initiated':
    default:
      return PaymentStatus.SENT;
  }
}
