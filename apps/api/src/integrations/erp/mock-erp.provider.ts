import { BadRequestException } from '@nestjs/common';
import { ErpImportResult, ErpProvider } from './erp-provider.interface';

export class MockErpProvider implements ErpProvider {
  readonly provider = 'mock';

  importInvoices(params: {
    programmeCode?: string;
    anchorId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ErpImportResult> {
    const programmeCode = params.programmeCode ?? 'MOCK-RF';
    if (programmeCode.includes('FAIL')) {
      return Promise.reject(new BadRequestException('Mock ERP import failure'));
    }
    if (programmeCode.includes('EMPTY')) {
      return Promise.resolve({
        provider: this.provider,
        providerReference: `mock-erp-${programmeCode}`,
        invoices: [],
        rawResponse: { params, count: 0 },
      });
    }
    const today = new Date('2026-01-15T00:00:00.000Z');
    const due = new Date(today);
    due.setDate(today.getDate() + 45);
    const invoices = [1, 2].map((index) => ({
      externalReference: `ERP-${programmeCode}-${index}`,
      programmeCode,
      buyerRegistrationNumber: params.anchorId,
      invoiceNumber: `ERP-${programmeCode}-${index}`,
      amount: 1000 * index,
      currency: 'GHS',
      issueDate: today.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      purchaseOrderNumber: `PO-${index}`,
      grnNumber: `GRN-${index}`,
      taxAmount: 125 * index,
      description: `Mock ERP reverse factoring invoice ${index}`,
      buyerApproved: true,
      buyerApprovalReference: `ERP-APP-${programmeCode}-${index}`,
    }));
    return Promise.resolve({
      provider: this.provider,
      providerReference: `mock-erp-${programmeCode}`,
      invoices,
      rawResponse: { params, count: invoices.length },
    });
  }

  confirmInvoiceApproval(params: {
    invoiceNumber: string;
    buyerReference?: string;
    approvalReference?: string;
  }) {
    const approved = !params.invoiceNumber.includes('UNAPPROVED');
    return Promise.resolve({
      provider: this.provider,
      approved,
      approvalReference:
        params.approvalReference ?? `MOCK-APP-${params.invoiceNumber}`,
      approvedAt: approved ? new Date().toISOString() : undefined,
      rawResponse: { params, approved },
    });
  }
}
