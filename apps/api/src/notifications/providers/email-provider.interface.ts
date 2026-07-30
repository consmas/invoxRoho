export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailProviderResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface EmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<EmailProviderResult>;
}
