import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EnginesModule } from '../engines/engines.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinancingController } from './financing.controller';
import { FinancingService } from './financing.service';

@Module({
  imports: [AuditModule, EnginesModule, NotificationsModule],
  controllers: [FinancingController],
  providers: [FinancingService],
})
export class FinancingModule {}
