import {
  NotificationProvider,
  NotificationProviderResult,
  SendEmailPayload,
  SendSmsPayload,
  SendWhatsAppPayload,
} from './notification-provider';

export class MockNotificationProvider implements NotificationProvider {
  sendEmail(payload: SendEmailPayload): Promise<NotificationProviderResult> {
    return Promise.resolve(this.result(payload.to, 'mock-email'));
  }

  sendSms(payload: SendSmsPayload): Promise<NotificationProviderResult> {
    return Promise.resolve(this.result(payload.to, 'mock-sms'));
  }

  sendWhatsApp(
    payload: SendWhatsAppPayload,
  ): Promise<NotificationProviderResult> {
    return Promise.resolve(this.result(payload.to, 'mock-whatsapp'));
  }

  private result(
    recipient: string,
    prefix: string,
  ): NotificationProviderResult {
    if (recipient.includes('FAIL')) {
      return { ok: false, errorMessage: 'Mock provider forced failure' };
    }
    return { ok: true, providerMessageId: `${prefix}-${Date.now()}` };
  }
}
