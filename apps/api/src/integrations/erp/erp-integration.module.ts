import { Module } from '@nestjs/common';
import { ErpIntegrationService } from './erp-integration.service';

@Module({
  providers: [ErpIntegrationService],
  exports: [ErpIntegrationService],
})
export class ErpIntegrationModule {}
