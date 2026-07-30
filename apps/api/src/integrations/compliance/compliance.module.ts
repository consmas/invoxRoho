import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { IntegrationLogService } from '../integration-log.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceReportsController } from './compliance-reports.controller';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule],
  controllers: [ComplianceController, ComplianceReportsController],
  providers: [ComplianceService, IntegrationLogService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
