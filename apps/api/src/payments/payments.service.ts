import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  LedgerEntryType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { IntegrationLogService } from '../integrations/integration-log.service';
import { createPaymentProvider } from '../integrations/payments/payment-provider.factory';
import { PaymentProvider } from '../integrations/payments/payment-provider.interface';
import { mapProviderStatus } from '../integrations/payments/payment-status.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifyWebhookSignature } from '../common/security';

@Injectable()
export class PaymentsService {
  private readonly provider: PaymentProvider;
  private readonly providerKey: string;
  private readonly webhookSecret: string;
  private readonly allowPlaintextWebhookSecrets: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: IntegrationLogService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    this.provider = createPaymentProvider(config);
    this.providerKey = config.get<string>('PAYMENT_PROVIDER') ?? 'sandbox';
    this.webhookSecret =
      config.get<string>('PAYMENT_WEBHOOK_SECRET') ?? 'dev_payment_secret';
    const appEnv = config.get<string>('APP_ENV') ?? config.get<string>('NODE_ENV');
    this.allowPlaintextWebhookSecrets = appEnv !== 'production';
  }

  findAll() {
    return this.prisma.payment.findMany({
      include: {
        financingTransaction: true,
        counterparty: true,
        reconciliationItems: true,
        ledgerEntries: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  findWebhookEvents() {
    return this.prisma.paymentWebhookEvent.findMany({
      include: { payment: true },
      orderBy: { receivedAt: 'desc' },
      take: 500,
    });
  }

  async findWebhookEvent(id: string) {
    const row = await this.prisma.paymentWebhookEvent.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!row) throw new NotFoundException('Payment webhook event not found');
    return row;
  }

  async findOne(id: string) {
    const row = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        financingTransaction: true,
        counterparty: true,
        reconciliationItems: true,
        ledgerEntries: { include: { account: true } },
        webhookEvents: true,
      },
    });
    if (!row) throw new NotFoundException('Payment not found');
    return row;
  }

  async create(data: Prisma.PaymentUncheckedCreateInput, actorUserId?: string) {
    const row = await this.prisma.payment.create({ data });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'Payment',
      entityId: row.id,
      afterJson: row,
    });
    return row;
  }

  async update(
    id: string,
    data: Prisma.PaymentUncheckedUpdateInput,
    actorUserId?: string,
  ) {
    const before = await this.findOne(id);
    const row = await this.prisma.payment.update({ where: { id }, data });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'Payment',
      entityId: id,
      beforeJson: before,
      afterJson: row,
    });
    return row;
  }

  async submitForApproval(id: string, actorUserId?: string) {
    const row = await this.update(
      id,
      { metadata: { submittedForApprovalAt: new Date().toISOString() } },
      actorUserId,
    );
    const approval = await this.prisma.approvalRequest.findFirst({
      where: {
        entityType: 'Payment',
        entityId: id,
        action: 'PAYMENT_APPROVAL',
        status: 'PENDING',
      },
    }) ?? await this.prisma.approvalRequest.create({
      data: {
        entityType: 'Payment',
        entityId: id,
        action: 'PAYMENT_APPROVAL',
        requestedById: actorUserId ?? 'system',
        requestPayload: {
          amount: row.amount.toString(),
          currency: row.currency,
          direction: row.direction,
          reference: row.reference,
          counterpartyId: row.counterpartyId,
          provider: row.provider,
        },
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'ApprovalRequest',
      entityId: approval.id,
      afterJson: approval,
      reason: `Requested payment approval for Payment:${id}`,
    });
    await this.notify('payment submitted for approval', row);
    return { payment: row, approval };
  }

  async approve(id: string, actorUserId?: string) {
    const row = await this.update(
      id,
      { approvedById: actorUserId, approvedAt: new Date() },
      actorUserId,
    );
    await this.notify('payment approved', row);
    return row;
  }

  async initiateProviderPayment(id: string, actorUserId?: string) {
    const before = await this.findOne(id);
    this.assertCanInitiate(before);
    if (before.providerReference && before.idempotencyKey) {
      return { payment: before, result: { duplicate: true } };
    }
    const idempotencyKey = before.idempotencyKey ?? `pay-${id}-${randomUUID()}`;
    const reference = before.reference ?? `PAY-${id.slice(0, 8)}`;
    const started = Date.now();
    const result = await this.provider.initiatePayment({
      paymentId: id,
      amount: Number(before.amount),
      currency: before.currency,
      direction: before.direction as 'OUTBOUND' | 'INBOUND',
      paymentType: before.direction,
      reference,
      narration: `INVOX ${before.direction} payment`,
      idempotencyKey,
      metadata: { financingTransactionId: before.financingTransactionId },
    });
    const status = mapProviderStatus(result.providerStatus);
    const row = await this.prisma.payment.update({
      where: { id },
      data: {
        status,
        provider: result.provider,
        providerReference: result.providerReference,
        externalTransactionId: result.externalTransactionId,
        idempotencyKey,
        providerStatus: result.providerStatus,
        providerResponseJson: result.rawResponse as Prisma.InputJsonValue,
        initiatedById: actorUserId,
        initiatedAt: new Date(),
        confirmedAt:
          status === PaymentStatus.CONFIRMED ? new Date() : undefined,
        failureReason: result.errorMessage,
      },
    });
    await this.logs.create({
      providerType: 'PAYMENT',
      providerKey: this.providerKey,
      direction: 'OUTBOUND',
      operation: 'payment.initiate',
      entityType: 'Payment',
      entityId: id,
      requestJson: { id, reference, idempotencyKey },
      responseJson: result,
      status: result.success ? 'SUCCESS' : 'FAILED',
      durationMs: Date.now() - started,
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'Payment',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: 'Sandbox payment provider initiation',
    });
    if (status === PaymentStatus.CONFIRMED)
      await this.applyConfirmedPayment(row);
    if (status === PaymentStatus.FAILED)
      await this.notify('payment failed', row);
    if (status === PaymentStatus.CONFIRMED)
      await this.notify('payment confirmed', row);
    return { payment: row, result };
  }

  async verifyProviderPayment(id: string, actorUserId?: string) {
    const before = await this.findOne(id);
    if (!before.providerReference) {
      throw new BadRequestException('Payment has no provider reference');
    }
    const started = Date.now();
    const result = await this.provider.verifyPayment(before.providerReference);
    const status = mapProviderStatus(result.providerStatus);
    const row = await this.prisma.payment.update({
      where: { id },
      data: {
        status,
        providerStatus: result.providerStatus,
        providerResponseJson: result.rawResponse as Prisma.InputJsonValue,
        verifiedById: actorUserId,
        verifiedAt: new Date(),
        lastProviderCheckAt: new Date(),
        confirmedAt:
          status === PaymentStatus.CONFIRMED ? new Date() : undefined,
        failureReason: result.errorMessage,
      },
    });
    await this.logs.create({
      providerType: 'PAYMENT',
      providerKey: this.providerKey,
      direction: 'OUTBOUND',
      operation: 'payment.verify',
      entityType: 'Payment',
      entityId: id,
      requestJson: { providerReference: before.providerReference },
      responseJson: result,
      status: result.success ? 'SUCCESS' : 'FAILED',
      durationMs: Date.now() - started,
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'Payment',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: 'Sandbox payment provider verification',
    });
    if (status === PaymentStatus.CONFIRMED)
      await this.applyConfirmedPayment(row);
    return { payment: row, result };
  }

  async confirm(id: string, actorUserId?: string) {
    const before = await this.findOne(id);
    const row = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.CONFIRMED, confirmedAt: new Date() },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.APPROVE,
      entityType: 'Payment',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: 'Manual payment confirmation',
    });
    await this.applyConfirmedPayment(row);
    return row;
  }

  async fail(id: string, reason: string, actorUserId?: string) {
    const row = await this.update(
      id,
      { status: PaymentStatus.FAILED, failureReason: reason },
      actorUserId,
    );
    await this.notify('payment failed', row);
    return row;
  }

  async markPaymentReturned(id: string, reason: string, actorUserId?: string) {
    const row = await this.update(
      id,
      { status: PaymentStatus.RETURNED, reversalReason: reason },
      actorUserId,
    );
    await this.notify('payment returned', row);
    return row;
  }

  async processProviderWebhook(
    provider: string,
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    const parsed = await this.provider.processWebhook(payload, signature);
    const eventReference =
      parsed.eventReference ??
      scalarString(payload.eventReference, randomUUID());
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { eventReference },
    });
    if (existing) return { duplicate: true, event: existing };
    const signatureValid = verifyWebhookSignature({
      payload,
      secret: this.webhookSecret,
      signature,
      allowPlaintextSecret: this.allowPlaintextWebhookSecrets,
    });
    const payment = await this.findPaymentForWebhook(payload, parsed);
    const event = await this.prisma.paymentWebhookEvent.create({
      data: {
        provider,
        eventType: scalarString(payload.eventType, 'payment.status'),
        eventReference,
        paymentId: payment?.id,
        providerReference: parsed.providerReference,
        payloadJson: payload as Prisma.InputJsonValue,
        signatureValid,
        processed: false,
      },
    });
    if (!signatureValid) {
      await this.logs.create({
        providerType: 'PAYMENT',
        providerKey: provider,
        direction: 'INBOUND',
        operation: 'payment.webhook',
        entityType: 'Payment',
        entityId: payment?.id,
        requestJson: payload,
        responseJson: { signatureValid },
        status: 'FAILED',
      });
      return { event, signatureValid };
    }
    if (!payment) {
      const updatedEvent = await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: { processingError: 'Payment not found for webhook' },
      });
      return { event: updatedEvent };
    }
    const status = mapProviderStatus(parsed.providerStatus);
    const row = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        webhookReference: eventReference,
        webhookReceivedAt: new Date(),
        providerStatus: parsed.providerStatus,
        externalTransactionId:
          parsed.externalTransactionId ?? payment.externalTransactionId,
        confirmedAt:
          status === PaymentStatus.CONFIRMED ? new Date() : undefined,
      },
    });
    await this.prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });
    await this.logs.create({
      providerType: 'PAYMENT',
      providerKey: provider,
      direction: 'INBOUND',
      operation: 'payment.webhook',
      entityType: 'Payment',
      entityId: payment.id,
      requestJson: payload,
      responseJson: parsed,
      status: 'SUCCESS',
    });
    if (status === PaymentStatus.CONFIRMED)
      await this.applyConfirmedPayment(row);
    return { payment: row, event, result: parsed };
  }

  processMockWebhook(payload: Record<string, unknown>, signature?: string) {
    return this.processProviderWebhook('sandbox', payload, signature);
  }

  private assertCanInitiate(
    payment: Awaited<ReturnType<PaymentsService['findOne']>>,
  ) {
    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Confirmed payment cannot be re-initiated');
    }
    if (payment.status === PaymentStatus.RETURNED) {
      throw new BadRequestException('Returned payment cannot be initiated');
    }
    if (Number(payment.amount) <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }
  }

  private async findPaymentForWebhook(
    payload: Record<string, unknown>,
    result: { providerReference?: string },
  ) {
    const providerReference =
      result.providerReference ??
      (typeof payload.providerReference === 'string'
        ? payload.providerReference
        : undefined);
    if (providerReference) {
      const byProvider = await this.prisma.payment.findFirst({
        where: { providerReference },
      });
      if (byProvider) return byProvider;
    }
    const reference =
      typeof payload.reference === 'string' ? payload.reference : '';
    return reference
      ? this.prisma.payment.findFirst({ where: { reference } })
      : null;
  }

  private async applyConfirmedPayment(payment: {
    id: string;
    financingTransactionId: string | null;
    direction: string;
    currency: string;
    amount: Prisma.Decimal;
    reference: string | null;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const existingRec = await tx.reconciliationItem.findFirst({
        where: { paymentId: payment.id },
      });
      if (!existingRec) {
        await tx.reconciliationItem.create({
          data: {
            paymentId: payment.id,
            statementReference: payment.reference,
            currency: payment.currency,
            statementAmount:
              payment.direction === 'OUTBOUND'
                ? new Prisma.Decimal(payment.amount).negated()
                : payment.amount,
            statementDate: new Date(),
            status: 'MATCHED',
            matchConfidence: '1',
            investigationNotes: 'Auto-matched from confirmed provider payment.',
          },
        });
      }
      if (payment.financingTransactionId) {
        const existingLedger = await tx.ledgerEntry.findFirst({
          where: { paymentId: payment.id },
        });
        if (!existingLedger) {
          if (payment.direction === 'OUTBOUND') {
            await this.postPaymentLedger(tx, payment, [
              [
                '2100',
                'Supplier disbursement confirmed',
                LedgerEntryType.DEBIT,
              ],
              ['1000', 'Cash disbursed to supplier', LedgerEntryType.CREDIT],
            ]);
            await tx.financingTransaction.update({
              where: { id: payment.financingTransactionId },
              data: { status: 'DISBURSED', disbursedAt: new Date() },
            });
          } else {
            await this.postPaymentLedger(tx, payment, [
              ['1000', 'Buyer collection confirmed', LedgerEntryType.DEBIT],
              ['1200', 'Financed receivable settled', LedgerEntryType.CREDIT],
            ]);
            await tx.financingTransaction.update({
              where: { id: payment.financingTransactionId },
              data: { status: 'COLLECTED', collectedAt: new Date() },
            });
          }
        }
      }
    });
  }

  private async postPaymentLedger(
    tx: Prisma.TransactionClient,
    payment: {
      id: string;
      financingTransactionId: string | null;
      currency: string;
      amount: Prisma.Decimal;
    },
    entries: [string, string, LedgerEntryType][],
  ) {
    for (const [code, name, entryType] of entries) {
      const account = await tx.ledgerAccount.upsert({
        where: { code },
        update: {},
        create: { code, name, currency: payment.currency },
      });
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          financingTransactionId: payment.financingTransactionId,
          paymentId: payment.id,
          entryType,
          amount: payment.amount,
          currency: payment.currency,
          description: name,
        },
      });
    }
  }

  private async notify(event: string, payment: { reference: string | null }) {
    await this.notifications
      .createLifecycleEmail('payment.disbursed', undefined, {
        entityName: payment.reference ?? 'Payment',
        status: event,
      })
      .catch(() => undefined);
  }
}

function scalarString(value: unknown, defaultValue: string) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return defaultValue;
}
