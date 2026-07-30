import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationLogService } from './integration-log.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ErpController } from './erp/erp.controller';
import { ErpService } from './erp/erp.service';
import { ComplianceModule } from './compliance/compliance.module';
import { KycScreeningService } from './kyc/kyc-screening.service';
import { UboRecordsController } from './kyc/ubo-records.controller';

@Module({
  imports: [PrismaModule, AuditModule, InvoicesModule, ComplianceModule],
  controllers: [IntegrationsController, ErpController, UboRecordsController],
  providers: [
    IntegrationLogService,
    IntegrationsService,
    ErpService,
    KycScreeningService,
  ],
  exports: [
    IntegrationLogService,
    IntegrationsService,
    ErpService,
    KycScreeningService,
  ],
})
export class IntegrationsModule {}
