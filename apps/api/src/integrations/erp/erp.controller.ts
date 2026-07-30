import { Body, Controller, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../auth/permissions';
import { ErpService } from './erp.service';

@Controller('integrations')
export class ErpController {
  constructor(private readonly erp: ErpService) {}

  @RequirePermissions(PERMISSIONS.integrationsUpdate)
  @Post('erp/import-invoices')
  importInvoices(
    @Body()
    payload: { invoices: Record<string, unknown>[]; idempotencyKey?: string },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.erp.importInvoices(payload, user?.id);
  }

  @RequirePermissions(PERMISSIONS.integrationsUpdate)
  @Post('erp/confirm-invoice-approval')
  confirmInvoiceApproval(
    @Body() payload: { invoiceId: string; externalReference?: string },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.erp.confirmInvoiceApproval(payload, user?.id);
  }

  @RequirePermissions(PERMISSIONS.einvoiceSubmit)
  @Post('einvoicing/validate-invoice/:invoiceId')
  validateInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.erp.validateInvoice(invoiceId, user?.id);
  }
}
