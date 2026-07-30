export interface EInvoicingProvider {
  validateInvoice(payload: {
    invoiceNumber: string;
    supplierTin?: string;
    buyerTin?: string;
    amount: number;
    currency: string;
    issueDate: string;
  }): Promise<{
    provider: string;
    status: 'VALIDATED' | 'FAILED' | 'REFERRED';
    fiscalReference?: string;
    reason?: string;
    rawResponse?: unknown;
  }>;
}
