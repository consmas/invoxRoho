import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  EmailProvider,
  EmailProviderResult,
  SendEmailPayload,
} from './email-provider.interface';

export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private readonly from: string;

  constructor(config: ConfigService, transporter?: nodemailer.Transporter) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    const secure = config.get<string>('SMTP_SECURE') === 'true';
    const user = config.get<string>('SMTP_USER');
    const password = config.get<string>('SMTP_PASSWORD');
    const missing = [
      ['SMTP_HOST', host],
      ['SMTP_USER', user],
      ['SMTP_PASSWORD', password],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length) {
      throw new BadRequestException(
        `SMTP email provider is configured but missing: ${missing.join(', ')}`,
      );
    }

    this.from = formatFrom(
      config.get<string>('DEFAULT_FROM_EMAIL') ?? 'no-reply@invox.local',
      config.get<string>('DEFAULT_FROM_NAME') ?? 'INVOX',
    );
    const createdTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    }) as unknown as nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
    this.transporter =
      (transporter as
        nodemailer.Transporter<SMTPTransport.SentMessageInfo> | undefined) ??
      createdTransporter;
  }

  async sendEmail(payload: SendEmailPayload): Promise<EmailProviderResult> {
    try {
      const response = await this.transporter.sendMail({
        to: payload.to,
        from: payload.from ?? this.from,
        replyTo: payload.replyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      return {
        success: true,
        provider: 'smtp',
        providerMessageId: response.messageId,
        rawResponse: {
          accepted: response.accepted,
          rejected: response.rejected,
          response: response.response,
        },
      };
    } catch (error) {
      return {
        success: false,
        provider: 'smtp',
        errorMessage: safeEmailError(error),
      };
    }
  }
}

function formatFrom(email: string, name: string) {
  return name ? `${name} <${email}>` : email;
}

function safeEmailError(error: unknown) {
  if (!(error instanceof Error)) return 'SMTP delivery failed';
  return error.message.replace(/pass(word)?=[^&\s]+/gi, 'password=[MASKED]');
}
