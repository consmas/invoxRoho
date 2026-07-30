import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EInvoicingService } from '../integrations/einvoicing/einvoicing.service';
import { ErpIntegrationService } from '../integrations/erp/erp-integration.service';
import { IntegrationLogService } from '../integrations/integration-log.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoiceImportService } from './invoice-import.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoiceImportService,
    IntegrationLogService,
    ErpIntegrationService,
    EInvoicingService,
  ],
  exports: [InvoicesService, InvoiceImportService],
})
export class InvoicesModule {}
