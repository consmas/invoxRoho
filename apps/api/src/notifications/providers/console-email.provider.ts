import { Logger } from '@nestjs/common';
import {
  EmailProvider,
  EmailProviderResult,
  SendEmailPayload,
} from './email-provider.interface';

export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  sendEmail(payload: SendEmailPayload): Promise<EmailProviderResult> {
    this.logger.log(
      JSON.stringify({
        to: payload.to,
        from: payload.from,
        replyTo: payload.replyTo,
        subject: payload.subject,
        text: maskTokens(payload.text),
        metadata: maskMetadata(payload.metadata),
      }),
    );
    return Promise.resolve({
      success: true,
      provider: 'console',
      providerMessageId: `console-email-${Date.now()}`,
    });
  }
}

function maskTokens(value?: string) {
  return value?.replace(/token=([^&\s]+)/gi, 'token=[MASKED]');
}

function maskMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      key.toLowerCase().includes('token') ? '[MASKED]' : value,
    ]),
  );
}
