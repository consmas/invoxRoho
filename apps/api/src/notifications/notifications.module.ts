import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IntegrationLogService } from '../integrations/integration-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, IntegrationLogService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
