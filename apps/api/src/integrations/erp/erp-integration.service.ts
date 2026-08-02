import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErpProvider } from './erp-provider.interface';
import { MockErpProvider } from './mock-erp.provider';

@Injectable()
export class ErpIntegrationService {
  private readonly provider: ErpProvider;

  constructor(config: ConfigService) {
    const providerKey = config.get<string>('ERP_PROVIDER') ?? 'mock';
    if (providerKey !== 'mock') {
      throw new BadRequestException(
        'Live ERP providers are not enabled; use mock.',
      );
    }
    this.provider = new MockErpProvider();
  }

  importInvoices(params: {
    programmeCode?: string;
    anchorId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    return this.provider.importInvoices(params);
  }

  confirmInvoiceApproval(params: {
    invoiceNumber: string;
    buyerReference?: string;
    approvalReference?: string;
  }) {
    return this.provider.confirmInvoiceApproval(params);
  }
}
