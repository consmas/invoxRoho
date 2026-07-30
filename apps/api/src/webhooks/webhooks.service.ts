import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { IntegrationLogService } from '../integrations/integration-log.service';
import { InvoiceImportService } from '../invoices/invoice-import.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
} from './dto/webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly signingSecret: string;
  private readonly maxRetries: number;
  private readonly retryDelaySeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly logs: IntegrationLogService,
    private readonly payments: PaymentsService,
    private readonly invoiceImports: InvoiceImportService,
    config: ConfigService,
  ) {
    this.signingSecret =
      config.get<string>('WEBHOOK_SIGNING_SECRET') ?? 'dev_webhook_secret';
    this.maxRetries = Number(config.get<string>('WEBHOOK_MAX_RETRIES') ?? 5);
    this.retryDelaySeconds = Number(
      config.get<string>('WEBHOOK_RETRY_DELAY_SECONDS') ?? 60,
    );
  }

  findEndpoints() {
    return this.prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findEndpoint(id: string) {
    const row = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Webhook endpoint not found');
    return row;
  }

  async createEndpoint(dto: CreateWebhookEndpointDto, actorUserId?: string) {
    const row = await this.prisma.webhookEndpoint.create({
      data: { ...dto, createdById: actorUserId },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'WebhookEndpoint',
      entityId: row.id,
      afterJson: row,
    });
    return row;
  }

  async updateEndpoint(
    id: string,
    dto: UpdateWebhookEndpointDto,
    actorUserId?: string,
  ) {
    const before = await this.findEndpoint(id);
    const row = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'WebhookEndpoint',
      entityId: id,
      beforeJson: before,
      afterJson: row,
    });
    return row;
  }

  async deleteEndpoint(id: string, actorUserId?: string) {
    const before = await this.findEndpoint(id);
    const row = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: { status: 'DISABLED' },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'WebhookEndpoint',
      entityId: id,
      beforeJson: before,
      afterJson: row,
      reason: 'Webhook endpoint disabled',
    });
    return row;
  }

  findDeliveries() {
    return this.prisma.webhookDelivery.findMany({
      include: { endpoint: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findDelivery(id: string) {
    const row = await this.prisma.webhookDelivery.findUnique({
      where: { id },
      include: { endpoint: true },
    });
    if (!row) throw new NotFoundException('Webhook delivery not found');
    return row;
  }

  async emit(
    eventType: string,
    entityType: string | undefined,
    entityId: string | undefined,
    payload: unknown,
  ) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ events: { has: eventType } }, { events: { has: '*' } }],
      },
    });
    for (const endpoint of endpoints) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventType,
          entityType,
          entityId,
          payloadJson: payload as Prisma.InputJsonValue,
        },
      });
      void this.deliver(delivery.id);
    }
  }

  async retryDelivery(id: string) {
    await this.findDelivery(id);
    await this.prisma.webhookDelivery.update({
      where: { id },
      data: { status: 'RETRYING', nextAttemptAt: null },
    });
    return this.deliver(id);
  }

  async cancelDelivery(id: string) {
    await this.findDelivery(id);
    return this.prisma.webhookDelivery.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async deliver(id: string) {
    const delivery = await this.findDelivery(id);
    const payloadText = JSON.stringify(delivery.payloadJson);
    const signature = createHmac(
      'sha256',
      delivery.endpoint.secret ?? this.signingSecret,
    )
      .update(payloadText)
      .digest('hex');
    const attempts = delivery.attempts + 1;
    try {
      const response = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-INVOX-Signature': signature,
          'X-INVOX-Event': delivery.eventType,
        },
        body: payloadText,
      });
      const responseBody = await response.text();
      const delivered = response.ok;
      const row = await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          attempts,
          lastAttemptAt: new Date(),
          status: delivered
            ? 'DELIVERED'
            : attempts >= this.maxRetries
              ? 'FAILED'
              : 'RETRYING',
          nextAttemptAt:
            delivered || attempts >= this.maxRetries
              ? null
              : new Date(Date.now() + this.retryDelaySeconds * 1000),
          responseStatus: response.status,
          responseBody: responseBody.slice(0, 2000),
          errorMessage: delivered ? null : response.statusText,
        },
      });
      await this.logs.create({
        providerType: 'WEBHOOK',
        providerKey: delivery.endpoint.name,
        direction: 'OUTBOUND',
        operation: 'webhook.deliver',
        entityType: delivery.entityType ?? undefined,
        entityId: delivery.entityId ?? undefined,
        requestJson: delivery.payloadJson,
        responseJson: {
          status: response.status,
          body: responseBody.slice(0, 500),
        },
        status: delivered ? 'SUCCESS' : 'FAILED',
        attempt: attempts,
      });
      return row;
    } catch (error) {
      return this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          attempts,
          lastAttemptAt: new Date(),
          status: attempts >= this.maxRetries ? 'FAILED' : 'RETRYING',
          nextAttemptAt:
            attempts >= this.maxRetries
              ? null
              : new Date(Date.now() + this.retryDelaySeconds * 1000),
          errorMessage:
            error instanceof Error ? error.message : 'Webhook delivery failed',
        },
      });
    }
  }

  processMockPaymentWebhook(
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    return this.payments.processMockWebhook(payload, signature);
  }

  processPaymentWebhook(
    provider: string,
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    return this.payments.processProviderWebhook(provider, payload, signature);
  }

  processErpWebhook(payload: Record<string, unknown>, signature?: string) {
    return this.invoiceImports.processErpWebhook(payload, signature);
  }

  processEInvoicingWebhook(
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    return this.invoiceImports.processEInvoicingWebhook(payload, signature);
  }
}
