import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequirePermissions(PERMISSIONS.paymentsReadV2)
  @Get()
  findAll() {
    return this.payments.findAll();
  }

  @RequirePermissions(PERMISSIONS.paymentsWebhookRead)
  @Get('webhook-events')
  findWebhookEvents() {
    return this.payments.findWebhookEvents();
  }

  @RequirePermissions(PERMISSIONS.paymentsWebhookRead)
  @Get('webhook-events/:id')
  findWebhookEvent(@Param('id') id: string) {
    return this.payments.findWebhookEvent(id);
  }

  @RequirePermissions(PERMISSIONS.paymentsCreate)
  @Post()
  create(
    @Body() body: Prisma.PaymentUncheckedCreateInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.payments.create(body, user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsReadV2)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payments.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.paymentsUpdate)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Prisma.PaymentUncheckedUpdateInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.payments.update(id, body, user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsSubmitForApproval)
  @Post(':id/submit-for-approval')
  submit(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.payments.submitForApproval(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsApprove)
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.payments.approve(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsInitiateProvider)
  @Post(':id/initiate-provider-payment')
  initiate(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.payments.initiateProviderPayment(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsVerifyProvider)
  @Post(':id/verify-provider-payment')
  verify(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.payments.verifyProviderPayment(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsConfirm)
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.payments.confirm(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsFail)
  @Post(':id/fail')
  fail(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.payments.fail(id, body.reason ?? 'Payment failed', user?.id);
  }

  @RequirePermissions(PERMISSIONS.paymentsReturn)
  @Post(':id/return')
  markReturned(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.payments.markPaymentReturned(
      id,
      body.reason ?? 'Payment returned',
      user?.id,
    );
  }
}
