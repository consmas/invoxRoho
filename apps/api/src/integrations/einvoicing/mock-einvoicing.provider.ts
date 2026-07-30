import { EInvoicingProvider } from './einvoicing-provider.interface';

export class MockEInvoicingProvider implements EInvoicingProvider {
  validateInvoice(payload: {
    invoiceNumber: string;
    supplierTin?: string;
    buyerTin?: string;
    amount: number;
    currency: string;
    issueDate: string;
  }) {
    if (payload.invoiceNumber.includes('TAXFAIL')) {
      return Promise.resolve({
        provider: 'mock',
        status: 'FAILED' as const,
        reason: 'Mock tax validation failure',
        rawResponse: { payload, rule: 'TAXFAIL' },
      });
    }
    if (payload.invoiceNumber.includes('TAXREVIEW')) {
      return Promise.resolve({
        provider: 'mock',
        status: 'REFERRED' as const,
        reason: 'Mock tax validation referred for review',
        rawResponse: { payload, rule: 'TAXREVIEW' },
      });
    }
    return Promise.resolve({
      provider: 'mock',
      status: 'VALIDATED' as const,
      fiscalReference: `MOCK-FISCAL-${payload.invoiceNumber}`,
      rawResponse: { payload, rule: 'DEFAULT_VALIDATED' },
    });
  }
}
