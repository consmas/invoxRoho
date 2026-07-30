export interface ErpInvoicePayload {
  externalReference?: string;
  programmeCode?: string;
  buyerRegistrationNumber?: string;
  supplierRegistrationNumber?: string;
  buyerTin?: string;
  supplierTin?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  purchaseOrderNumber?: string;
  grnNumber?: string;
  taxAmount?: number;
  description?: string;
  buyerApproved?: boolean;
  buyerApprovalReference?: string;
}

export interface ErpImportResult {
  provider: string;
  providerReference?: string;
  invoices: ErpInvoicePayload[];
  rawResponse?: unknown;
}

export interface ErpProvider {
  importInvoices(params: {
    programmeCode?: string;
    anchorId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ErpImportResult>;

  confirmInvoiceApproval(params: {
    invoiceNumber: string;
    buyerReference?: string;
    approvalReference?: string;
  }): Promise<{
    provider: string;
    approved: boolean;
    approvalReference?: string;
    approvedAt?: string;
    rawResponse?: unknown;
  }>;
}
