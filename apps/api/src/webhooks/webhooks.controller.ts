import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import {
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
} from './dto/webhook.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @RequirePermissions(PERMISSIONS.webhooksRead)
  @Get('endpoints')
  findEndpoints() {
    return this.webhooks.findEndpoints();
  }

  @RequirePermissions(PERMISSIONS.webhooksCreate)
  @Post('endpoints')
  createEndpoint(
    @Body() dto: CreateWebhookEndpointDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.webhooks.createEndpoint(dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.webhooksRead)
  @Get('endpoints/:id')
  findEndpoint(@Param('id') id: string) {
    return this.webhooks.findEndpoint(id);
  }

  @RequirePermissions(PERMISSIONS.webhooksUpdate)
  @Patch('endpoints/:id')
  updateEndpoint(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookEndpointDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.webhooks.updateEndpoint(id, dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.webhooksDelete)
  @Delete('endpoints/:id')
  deleteEndpoint(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.webhooks.deleteEndpoint(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.webhooksRead)
  @Get('deliveries')
  findDeliveries() {
    return this.webhooks.findDeliveries();
  }

  @RequirePermissions(PERMISSIONS.webhooksRead)
  @Get('deliveries/:id')
  findDelivery(@Param('id') id: string) {
    return this.webhooks.findDelivery(id);
  }

  @RequirePermissions(PERMISSIONS.webhooksRetry)
  @Post('deliveries/:id/retry')
  retryDelivery(@Param('id') id: string) {
    return this.webhooks.retryDelivery(id);
  }

  @RequirePermissions(PERMISSIONS.webhooksUpdate)
  @Post('deliveries/:id/cancel')
  cancelDelivery(@Param('id') id: string) {
    return this.webhooks.cancelDelivery(id);
  }

  @Public()
  @Post('payments/mock')
  processMockPaymentWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-invox-signature') signature?: string,
    @Req() request?: Request,
  ) {
    assertWebhookRateLimit(request, 'payments/mock');
    return this.webhooks.processMockPaymentWebhook(payload, signature);
  }

  @Public()
  @Post('payments/sandbox')
  processSandboxPaymentWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-invox-signature') signature?: string,
    @Req() request?: Request,
  ) {
    assertWebhookRateLimit(request, 'payments/sandbox');
    return this.webhooks.processPaymentWebhook('sandbox', payload, signature);
  }

  @Public()
  @Post('providers/erp')
  processErpProviderWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-invox-signature') signature?: string,
    @Req() request?: Request,
  ) {
    assertWebhookRateLimit(request, 'providers/erp');
    return this.webhooks.processErpWebhook(payload, signature);
  }

  @Public()
  @Post('providers/einvoicing')
  processEInvoicingProviderWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-invox-signature') signature?: string,
    @Req() request?: Request,
  ) {
    assertWebhookRateLimit(request, 'providers/einvoicing');
    return this.webhooks.processEInvoicingWebhook(payload, signature);
  }
}

const webhookHits = new Map<string, number[]>();
const WEBHOOK_WINDOW_MS = 60_000;
const WEBHOOK_MAX_REQUESTS = 120;

export function resetWebhookRateLimitForTests() {
  webhookHits.clear();
}

export function assertWebhookRateLimit(request: Request | undefined, route: string) {
  const ip =
    request?.ip ??
    request?.headers['x-forwarded-for']?.toString().split(',')[0] ??
    'unknown';
  const key = `${route}:${ip}`;
  const now = Date.now();
  const recent = (webhookHits.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WEBHOOK_WINDOW_MS,
  );
  if (recent.length >= WEBHOOK_MAX_REQUESTS) {
    throw new HttpException(
      'Webhook rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  recent.push(now);
  webhookHits.set(key, recent);
}
