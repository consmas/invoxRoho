import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EInvoicingProvider } from './einvoicing-provider.interface';
import { MockEInvoicingProvider } from './mock-einvoicing.provider';

@Injectable()
export class EInvoicingService {
  private readonly provider: EInvoicingProvider;

  constructor(config: ConfigService) {
    const providerKey = config.get<string>('EINVOICING_PROVIDER') ?? 'mock';
    if (providerKey !== 'mock') {
      throw new BadRequestException(
        'Live e-invoicing providers are not enabled; use mock.',
      );
    }
    this.provider = new MockEInvoicingProvider();
  }

  validateInvoice(payload: {
    invoiceNumber: string;
    supplierTin?: string;
    buyerTin?: string;
    amount: number;
    currency: string;
    issueDate: string;
  }) {
    return this.provider.validateInvoice(payload);
  }
}
