import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { IntegrationLogService } from '../integrations/integration-log.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNotificationDto,
  SendTemplateNotificationDto,
} from './dto/notification.dto';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { ConsoleNotificationProvider } from './providers/console-notification.provider';
import {
  EmailProvider,
  SendEmailPayload,
} from './providers/email-provider.interface';
import { MockNotificationProvider } from './providers/mock-notification.provider';
import { NotificationProvider } from './providers/notification-provider';
import type { NotificationProviderResult } from './providers/notification-provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { renderTemplate } from './templates/email-templates';

@Injectable()
export class NotificationsService {
  private readonly provider: NotificationProvider;
  private readonly emailProvider: EmailProvider;
  private readonly providerKey: string;
  private readonly emailProviderKey: string;
  private readonly appUrl: string;
  private readonly defaultFrom: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly logs: IntegrationLogService,
    config: ConfigService,
  ) {
    this.providerKey = config.get<string>('NOTIFICATION_PROVIDER') ?? 'console';
    this.emailProviderKey = config.get<string>('EMAIL_PROVIDER') ?? 'console';
    this.appUrl = config.get<string>('APP_URL') ?? 'http://localhost:3000';
    this.defaultFrom = formatFrom(
      config.get<string>('DEFAULT_FROM_EMAIL') ?? 'no-reply@invox.local',
      config.get<string>('DEFAULT_FROM_NAME') ?? 'INVOX',
    );
    this.provider =
      this.providerKey === 'mock'
        ? new MockNotificationProvider()
        : new ConsoleNotificationProvider();
    this.emailProvider = this.createEmailProvider(config);
  }

  findAll() {
    return this.prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.notificationLog.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Notification not found');
    return row;
  }

  async create(dto: CreateNotificationDto, actorUserId?: string) {
    const row = await this.prisma.notificationLog.create({
      data: {
        ...dto,
        userId: dto.recipientUserId,
        channel: dto.channel as NotificationChannel,
        provider: dto.provider ?? this.providerForChannel(dto.channel),
        templateKey: dto.templateKey,
        payloadJson: dto.payloadJson as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'NotificationLog',
      entityId: row.id,
      afterJson: row,
    });
    return row;
  }

  async update(
    id: string,
    dto: Partial<CreateNotificationDto>,
    actorUserId?: string,
  ) {
    const before = await this.findOne(id);
    const row = await this.prisma.notificationLog.update({
      where: { id },
      data: {
        ...dto,
        userId: dto.recipientUserId,
        channel: dto.channel as NotificationChannel | undefined,
        payloadJson: dto.payloadJson as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'NotificationLog',
      entityId: id,
      beforeJson: before,
      afterJson: row,
    });
    return row;
  }

  async sendNotification(id: string, actorUserId?: string) {
    const notification = await this.findOne(id);
    if (notification.status === NotificationStatus.CANCELLED) {
      throw new BadRequestException('Cancelled notification cannot be sent');
    }
    if (notification.status === NotificationStatus.SENT) {
      throw new BadRequestException('Sent notification cannot be resent');
    }
    const started = Date.now();
    const attempts = notification.attempts + 1;
    await this.prisma.notificationLog.update({
      where: { id },
      data: {
        attempts,
        lastAttemptAt: new Date(),
        status:
          notification.status === NotificationStatus.FAILED
            ? NotificationStatus.RETRYING
            : NotificationStatus.SENDING,
      },
    });
    const result: NotificationProviderResult =
      await this.dispatch(notification);
    const row = await this.prisma.notificationLog.update({
      where: { id },
      data: result.ok
        ? {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            failureReason: null,
            providerMessageId: result.providerMessageId,
          }
        : {
            status: NotificationStatus.FAILED,
            failedAt: new Date(),
            failureReason:
              result.errorMessage ?? 'Notification provider failed',
          },
    });
    await this.logs.create({
      providerType: channelProviderType(notification.channel),
      providerKey: notification.provider ?? this.providerKey,
      direction: 'OUTBOUND',
      operation:
        notification.channel === NotificationChannel.EMAIL
          ? 'email.send'
          : 'notification.send',
      entityType: 'Notification',
      entityId: id,
      requestJson: {
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        templateKey: notification.templateKey,
        payloadJson: notification.payloadJson,
      },
      responseJson: result,
      status: result.ok ? 'SUCCESS' : 'FAILED',
      attempt: attempts,
      durationMs: Date.now() - started,
    });
    await this.audit.log({
      actorUserId,
      action: result.ok ? AuditAction.SUBMIT : AuditAction.UPDATE,
      entityType: 'NotificationLog',
      entityId: id,
      afterJson: row,
      reason: result.ok ? 'Notification sent' : 'Notification failed',
    });
    return row;
  }

  retryNotification(id: string, actorUserId?: string) {
    return this.sendNotification(id, actorUserId);
  }

  async cancelNotification(id: string, actorUserId?: string) {
    const before = await this.findOne(id);
    const row = await this.prisma.notificationLog.update({
      where: { id },
      data: { status: NotificationStatus.CANCELLED },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'NotificationLog',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: 'Notification cancelled',
    });
    return row;
  }

  async sendTemplate(dto: SendTemplateNotificationDto, actorUserId?: string) {
    const rendered = renderTemplate(dto.templateKey, {
      appUrl: this.appUrl,
      ...(dto.data ?? {}),
    });
    const created = await this.create(
      {
        channel: dto.channel ?? 'EMAIL',
        recipient: dto.recipient,
        subject: dto.subject ?? rendered.subject,
        message: rendered.text,
        templateKey: dto.templateKey,
        payloadJson: { ...(dto.data ?? {}), html: rendered.html },
      },
      actorUserId,
    );
    return this.sendNotification(created.id, actorUserId);
  }

  async sendEmail(payload: SendEmailPayload, actorUserId?: string) {
    const created = await this.create(
      {
        channel: 'EMAIL',
        provider: this.emailProviderKey,
        recipient: Array.isArray(payload.to)
          ? payload.to.join(',')
          : payload.to,
        subject: payload.subject,
        message: payload.text ?? payload.html ?? '',
        payloadJson: {
          html: payload.html,
          text: payload.text,
          replyTo: payload.replyTo,
          metadata: payload.metadata,
        },
      },
      actorUserId,
    );
    return this.sendNotification(created.id, actorUserId);
  }

  sendTemplateEmail(
    templateKey: string,
    recipient: string,
    variables: Record<string, unknown>,
    actorUserId?: string,
  ) {
    return this.sendTemplate(
      { templateKey, recipient, channel: 'EMAIL', data: variables },
      actorUserId,
    );
  }

  async createLifecycleEmail(
    templateKey: string,
    recipient: string | null | undefined,
    variables: Record<string, unknown>,
    actorUserId?: string,
  ) {
    if (!recipient) {
      return this.prisma.notificationLog.create({
        data: {
          channel: NotificationChannel.EMAIL,
          provider: this.emailProviderKey,
          templateKey,
          subject: templateKey,
          message: 'Notification skipped: no email recipient available',
          recipient: '',
          payloadJson: variables as Prisma.InputJsonValue,
          status: NotificationStatus.FAILED,
          failureReason: 'No email recipient available',
        },
      });
    }
    try {
      return await this.sendTemplateEmail(
        templateKey,
        recipient,
        variables,
        actorUserId,
      );
    } catch {
      return this.prisma.notificationLog.create({
        data: {
          channel: NotificationChannel.EMAIL,
          provider: this.emailProviderKey,
          templateKey,
          subject: templateKey,
          message: 'Notification failed before provider dispatch',
          recipient,
          payloadJson: variables as Prisma.InputJsonValue,
          status: NotificationStatus.FAILED,
          failureReason: 'Notification rendering or delivery failed',
        },
      });
    }
  }

  private dispatch(
    notification: Awaited<ReturnType<NotificationsService['findOne']>>,
  ) {
    if (notification.channel === NotificationChannel.EMAIL) {
      return this.dispatchEmail(notification);
    }
    if (notification.channel === NotificationChannel.SMS) {
      return (
        this.provider.sendSms?.({
          to: notification.recipient,
          message: notification.message,
          payload: notification.payloadJson,
        }) ?? Promise.resolve({ ok: false, errorMessage: 'SMS not supported' })
      );
    }
    if (notification.channel === NotificationChannel.WHATSAPP) {
      return (
        this.provider.sendWhatsApp?.({
          to: notification.recipient,
          message: notification.message,
          payload: notification.payloadJson,
        }) ??
        Promise.resolve({ ok: false, errorMessage: 'WhatsApp not supported' })
      );
    }
    return Promise.resolve({
      ok: true,
      providerMessageId: `in-app-${Date.now()}`,
    });
  }

  private async dispatchEmail(
    notification: Awaited<ReturnType<NotificationsService['findOne']>>,
  ): Promise<NotificationProviderResult> {
    const payload = (notification.payloadJson ?? {}) as Record<string, unknown>;
    const result = await this.emailProvider.sendEmail({
      to: notification.recipient,
      subject: notification.subject ?? 'INVOX Notification',
      text:
        typeof payload.text === 'string' ? payload.text : notification.message,
      html: typeof payload.html === 'string' ? payload.html : undefined,
      from: this.defaultFrom,
      replyTo:
        typeof payload.replyTo === 'string' ? payload.replyTo : undefined,
      metadata:
        typeof payload.metadata === 'object' && payload.metadata
          ? (payload.metadata as Record<string, unknown>)
          : undefined,
    });
    return {
      ok: result.success,
      providerMessageId: result.providerMessageId,
      errorMessage: result.errorMessage,
      responseJson: result.rawResponse,
    };
  }

  private providerForChannel(channel: string) {
    return channel === 'EMAIL' ? this.emailProviderKey : this.providerKey;
  }

  private createEmailProvider(config: ConfigService) {
    if (this.emailProviderKey === 'smtp') return new SmtpEmailProvider(config);
    return new ConsoleEmailProvider();
  }
}

function channelProviderType(channel: NotificationChannel) {
  if (channel === NotificationChannel.SMS) return 'SMS';
  if (channel === NotificationChannel.WHATSAPP) return 'WHATSAPP';
  if (channel === NotificationChannel.WEBHOOK) return 'WEBHOOK';
  return 'EMAIL';
}

function formatFrom(email: string, name: string) {
  return name ? `${name} <${email}>` : email;
}
