import { Module } from '@nestjs/common';
import { EInvoicingService } from './einvoicing.service';

@Module({
  providers: [EInvoicingService],
  exports: [EInvoicingService],
})
export class EInvoicingModule {}
