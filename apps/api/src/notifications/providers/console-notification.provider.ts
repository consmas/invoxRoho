import { Logger } from '@nestjs/common';
import {
  NotificationProvider,
  NotificationProviderResult,
  SendEmailPayload,
  SendSmsPayload,
  SendWhatsAppPayload,
} from './notification-provider';

export class ConsoleNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(ConsoleNotificationProvider.name);

  sendEmail(payload: SendEmailPayload): Promise<NotificationProviderResult> {
    this.logger.log(
      `EMAIL to=${payload.to} subject=${payload.subject ?? ''} message=${payload.message}`,
    );
    return Promise.resolve({
      ok: true,
      providerMessageId: `console-email-${Date.now()}`,
    });
  }

  sendSms(payload: SendSmsPayload): Promise<NotificationProviderResult> {
    this.logger.log(`SMS to=${payload.to} message=${payload.message}`);
    return Promise.resolve({
      ok: true,
      providerMessageId: `console-sms-${Date.now()}`,
    });
  }

  sendWhatsApp(
    payload: SendWhatsAppPayload,
  ): Promise<NotificationProviderResult> {
    this.logger.log(`WHATSAPP to=${payload.to} message=${payload.message}`);
    return Promise.resolve({
      ok: true,
      providerMessageId: `console-whatsapp-${Date.now()}`,
    });
  }
}
