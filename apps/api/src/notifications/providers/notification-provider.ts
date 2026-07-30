export type SendEmailPayload = {
  to: string;
  from?: string;
  subject?: string;
  message: string;
  payload?: unknown;
};

export type SendSmsPayload = {
  to: string;
  message: string;
  payload?: unknown;
};

export type SendWhatsAppPayload = SendSmsPayload;

export type NotificationProviderResult = {
  ok: boolean;
  providerMessageId?: string;
  errorMessage?: string;
  responseJson?: unknown;
};

export interface NotificationProvider {
  sendEmail?(payload: SendEmailPayload): Promise<NotificationProviderResult>;
  sendSms?(payload: SendSmsPayload): Promise<NotificationProviderResult>;
  sendWhatsApp?(
    payload: SendWhatsAppPayload,
  ): Promise<NotificationProviderResult>;
}
