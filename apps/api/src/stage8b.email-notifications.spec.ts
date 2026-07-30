import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { AuthService } from './auth/auth.service';
import { ApprovalsService } from './approvals/approvals.service';
import { NotificationsService } from './notifications/notifications.service';
import { ConsoleEmailProvider } from './notifications/providers/console-email.provider';
import { SmtpEmailProvider } from './notifications/providers/smtp-email.provider';
import { renderTemplate } from './notifications/templates/email-templates';

const config = (values: Record<string, string>) =>
  new ConfigService(values, { skipProcessEnv: true });

describe('Stage 8B email notification delivery', () => {
  it('sends console email successfully and masks tokens in log output', async () => {
    const provider = new ConsoleEmailProvider();
    const result = await provider.sendEmail({
      to: 'ops@example.com',
      subject: 'Invite',
      text: 'Open http://localhost:3000/accept-invite?token=secret-token',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('console');
  });

  it('validates SMTP config and sends with a mocked transport', async () => {
    expect(
      () => new SmtpEmailProvider(config({ EMAIL_PROVIDER: 'smtp' })),
    ).toThrow(BadRequestException);

    const transport = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'smtp-1',
        accepted: ['ops@example.com'],
        rejected: [],
        response: '250 OK',
      }),
    };
    const provider = new SmtpEmailProvider(
      config({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_USER: 'user',
        SMTP_PASSWORD: 'password',
        DEFAULT_FROM_EMAIL: 'no-reply@invox.local',
        DEFAULT_FROM_NAME: 'INVOX',
      }),
      transport as never,
    );

    const result = await provider.sendEmail({
      to: 'ops@example.com',
      subject: 'Test',
      text: 'Hello',
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe('smtp-1');
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Test' }),
    );
  });

  it('handles SMTP failure without exposing passwords', async () => {
    const provider = new SmtpEmailProvider(
      config({
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASSWORD: 'secret',
      }),
      {
        sendMail: jest
          .fn()
          .mockRejectedValue(
            new Error('authentication failed password=secret'),
          ),
      } as never,
    );

    const result = await provider.sendEmail({
      to: 'ops@example.com',
      subject: 'Test',
      text: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).not.toContain('secret');
  });

  it('renders templates and rejects missing variables', () => {
    const rendered = renderTemplate('approval.requested', {
      userName: 'RM',
      entityName: 'Invoice INV-1',
      actionUrl: 'http://localhost:3000/approvals/1',
    });

    expect(rendered.subject).toContain('Invoice INV-1');
    expect(rendered.text).toContain('RM');
    expect(() => renderTemplate('approval.requested', {})).toThrow(
      BadRequestException,
    );
  });

  it('transitions notification send, retry and cancel states', async () => {
    const rows: Record<string, Record<string, unknown>> = {
      pending: notificationRow('pending', NotificationStatus.PENDING),
      failed: notificationRow('failed', NotificationStatus.FAILED),
      cancel: notificationRow('cancel', NotificationStatus.PENDING),
    };
    const prisma = notificationPrisma(rows);
    const service = new NotificationsService(
      prisma as never,
      { log: jest.fn() } as never,
      { create: jest.fn().mockResolvedValue({ id: 'log-1' }) } as never,
      config({ EMAIL_PROVIDER: 'console' }),
    );

    const providerMessageIdMatcher = expect.stringContaining(
      'console-email-',
    ) as unknown as string;
    await expect(service.sendNotification('pending')).resolves.toMatchObject({
      status: NotificationStatus.SENT,
      providerMessageId: providerMessageIdMatcher,
    });
    expect(rows.pending.attempts).toBe(1);

    await expect(service.retryNotification('failed')).resolves.toMatchObject({
      status: NotificationStatus.SENT,
    });
    expect(rows.failed.attempts).toBe(1);

    await expect(service.cancelNotification('cancel')).resolves.toMatchObject({
      status: NotificationStatus.CANCELLED,
    });
  });

  it('invite and password reset flows trigger email notifications', async () => {
    const createdUser = {
      id: 'user-1',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
    };
    const users = {
      create: jest.fn().mockResolvedValue(createdUser),
      findByEmailForAuth: jest.fn().mockResolvedValue(createdUser),
    };
    const notifications = {
      sendTemplateEmail: jest.fn().mockResolvedValue({ id: 'notice-1' }),
    };
    const service = new AuthService(
      users as never,
      { signAsync: jest.fn() } as never,
      config({ APP_URL: 'http://localhost:3000' }),
      { log: jest.fn() } as never,
      notifications as never,
    );

    await service.inviteUser({ email: 'new@example.com' });
    await service.requestPasswordReset({ email: 'new@example.com' });

    const actionUrlMatcher = expect.stringContaining(
      'token=',
    ) as unknown as string;
    const variablesMatcher = expect.objectContaining({
      actionUrl: actionUrlMatcher,
    }) as Record<string, unknown>;
    expect(notifications.sendTemplateEmail).toHaveBeenCalledWith(
      'user.invited',
      'new@example.com',
      variablesMatcher,
      undefined,
    );
    expect(notifications.sendTemplateEmail).toHaveBeenCalledWith(
      'password.reset',
      'new@example.com',
      variablesMatcher,
    );
  });

  it('approval notification failures do not break approval creation', async () => {
    const prisma = {
      approvalRequest: {
        create: jest.fn().mockResolvedValue({
          id: 'approval-1',
          entityType: 'Invoice',
          entityId: 'invoice-1',
          action: 'APPROVE_INVOICE',
          status: 'PENDING',
          requestedById: 'user-1',
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'rm@example.com' }),
      },
    };
    const service = new ApprovalsService(
      prisma as never,
      { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) } as never,
      {
        createLifecycleEmail: jest
          .fn()
          .mockRejectedValue(new Error('email failed')),
      } as never,
    );

    await expect(
      service.create(
        {
          entityType: 'Invoice',
          entityId: 'invoice-1',
          action: 'APPROVE_INVOICE',
        },
        {
          id: 'user-1',
          email: 'rm@example.com',
          roles: [],
          permissions: [],
        },
      ),
    ).resolves.toMatchObject({ id: 'approval-1' });
  });
});

function notificationRow(id: string, status: NotificationStatus) {
  return {
    id,
    channel: NotificationChannel.EMAIL,
    provider: 'console',
    templateKey: null,
    subject: 'Subject',
    message: 'Message',
    recipient: 'ops@example.com',
    payloadJson: { text: 'Message' },
    status,
    attempts: 0,
  };
}

function notificationPrisma(rows: Record<string, Record<string, unknown>>) {
  return {
    notificationLog: {
      findMany: jest.fn(),
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(rows[where.id]),
        ),
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'notice-created', ...data }),
        ),
      update: jest
        .fn()
        .mockImplementation(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            rows[where.id] = { ...rows[where.id], ...data };
            return Promise.resolve(rows[where.id]);
          },
        ),
    },
  };
}
