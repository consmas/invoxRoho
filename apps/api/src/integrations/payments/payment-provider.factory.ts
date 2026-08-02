import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from './payment-provider.interface';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

export function createPaymentProvider(config: ConfigService): PaymentProvider {
  const mode = config.get<string>('PAYMENT_MODE') ?? 'sandbox';
  const provider = config.get<string>('PAYMENT_PROVIDER') ?? 'sandbox';
  if (mode === 'live' || provider !== 'sandbox') {
    throw new BadRequestException(
      'Live payment providers are disabled; use sandbox.',
    );
  }
  return new SandboxPaymentProvider(config);
}
