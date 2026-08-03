import ExcelJS from 'exceljs';
import { CounterpartyType, InvoiceStatus } from '@prisma/client';
import { MockEInvoicingProvider } from './integrations/einvoicing/mock-einvoicing.provider';
import { MockErpProvider } from './integrations/erp/mock-erp.provider';
import { InvoiceImportService } from './invoices/invoice-import.service';
import { PERMISSIONS } from './auth/permissions';

function baseRows() {
  const programme = { id: 'programme-1', code: 'RF-DEMO', anchorId: 'buyer-1' };
  const buyer = { id: 'buyer-1', type: CounterpartyType.ANCHOR };
  const supplier = { id: 'supplier-1', type: CounterpartyType.SUPPLIER };
  const batch = {
    id: 'batch-1',
    status: 'COMPLETED',
    sourceType: 'CSV',
    totalRows: 1,
  };
  const prisma = {
    programme: {
      findUnique: jest.fn().mockResolvedValue(programme),
    },
    counterparty: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(buyer)
        .mockResolvedValue(supplier),
    },
    programmeParticipant: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'participant-1', isActive: true }),
      findFirst: jest.fn().mockResolvedValue({ counterparty: supplier }),
    },
    invoice: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({
        id: 'invoice-1',
        invoiceNumber: 'INV-1',
        status: InvoiceStatus.APPROVED,
      }),
      update: jest.fn(),
    },
    invoiceImportBatch: {
      create: jest.fn().mockResolvedValue(batch),
      update: jest.fn().mockResolvedValue({ ...batch, rows: [] }),
      findUnique: jest.fn().mockResolvedValue(batch),
      findMany: jest.fn(),
    },
    invoiceImportRow: {
      create: jest.fn().mockResolvedValue({ id: 'row-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    workflowCase: {
      create: jest.fn().mockResolvedValue({ id: 'workflow-1' }),
    },
  };
  return { prisma, programme, buyer, supplier };
}

function service(prisma: Record<string, unknown>) {
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const logs = { create: jest.fn().mockResolvedValue({ id: 'log-1' }) };
  const notifications = {
    createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  const erp = {
    importInvoices: jest.fn().mockResolvedValue({
      provider: 'mock',
      providerReference: 'erp-1',
      invoices: [
        {
          programmeCode: 'RF-DEMO',
          invoiceNumber: 'ERP-1',
          amount: 100,
          currency: 'GHS',
          issueDate: '2026-01-01',
          dueDate: '2026-02-01',
          buyerApproved: true,
        },
      ],
      rawResponse: { ok: true },
    }),
    confirmInvoiceApproval: jest.fn(),
  };
  const einvoicing = {
    validateInvoice: jest.fn(),
  };
  return {
    imports: new InvoiceImportService(
      prisma as never,
      audit as never,
      logs as never,
      notifications as never,
      erp as never,
      einvoicing as never,
      { get: jest.fn().mockReturnValue('5000') } as never,
    ),
    audit,
    logs,
    notifications,
    erp,
    einvoicing,
  };
}

describe('Stage 8E invoice import and validation foundations', () => {
  it('imports CSV rows into an import batch and writes audit/integration logs', async () => {
    const { prisma } = baseRows();
    const { imports, audit, logs } = service(prisma);
    const csv = Buffer.from(
      [
        'programmeCode,invoiceNumber,amount,currency,issueDate,dueDate,buyerApproved,buyerApprovalReference',
        'RF-DEMO,INV-1,100,GHS,2026-01-01,2026-02-01,true,APP-1',
      ].join('\n'),
    );

    const batch = await imports.parseCsvImport(csv, {}, 'actor-1');

    expect(batch.id).toBe('batch-1');
    expect(JSON.stringify(prisma.invoiceImportRow.create.mock.calls)).toContain(
      '"status":"VALID"',
    );
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'invoice_import.csv',
        status: 'SUCCESS',
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'InvoiceImportBatch' }),
    );
  });

  it('imports Excel rows using the same validation path', async () => {
    const { prisma } = baseRows();
    const { imports } = service(prisma);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Invoices');
    sheet.addRow([
      'programmeCode',
      'invoiceNumber',
      'amount',
      'currency',
      'issueDate',
      'dueDate',
      'buyerApproved',
    ]);
    sheet.addRow([
      'RF-DEMO',
      'XLS-1',
      100,
      'GHS',
      '2026-01-01',
      '2026-02-01',
      true,
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await imports.parseExcelImport(buffer, {}, 'actor-1');

    expect(JSON.stringify(prisma.invoiceImportRow.create.mock.calls)).toContain(
      '"status":"VALID"',
    );
  });

  it('saves invalid rows and creates workflow exceptions', async () => {
    const { prisma } = baseRows();
    prisma.counterparty.findFirst = jest.fn().mockResolvedValue(null);
    const { imports } = service(prisma);

    await imports.importFromApi(
      [
        {
          programmeCode: 'RF-DEMO',
          invoiceNumber: '',
          amount: 0,
          currency: '',
          issueDate: 'bad',
          dueDate: 'bad',
        },
      ],
      {},
      'actor-1',
    );

    expect(JSON.stringify(prisma.invoiceImportRow.create.mock.calls)).toContain(
      '"status":"INVALID"',
    );
    expect(JSON.stringify(prisma.workflowCase.create.mock.calls)).toContain(
      'INVOICE_EXCEPTION',
    );
  });

  it('detects duplicate invoice rows and links the duplicate invoice', async () => {
    const { prisma } = baseRows();
    prisma.invoice.findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'invoice-existing' });
    const { imports } = service(prisma);

    await imports.importFromApi(
      [
        {
          programmeCode: 'RF-DEMO',
          invoiceNumber: 'DUP-1',
          amount: 100,
          currency: 'GHS',
          issueDate: '2026-01-01',
          dueDate: '2026-02-01',
          buyerApproved: true,
        },
      ],
      {},
      'actor-1',
    );

    const rowCalls = JSON.stringify(prisma.invoiceImportRow.create.mock.calls);
    expect(rowCalls).toContain('"status":"DUPLICATE"');
    expect(rowCalls).toContain('"duplicateOfInvoiceId":"invoice-existing"');
  });

  it('runs mock ERP import and writes provider integration logs', async () => {
    const { prisma } = baseRows();
    const { imports, logs, erp } = service(prisma);

    await imports.importFromErp({ programmeCode: 'RF-DEMO' }, 'actor-1');

    expect(erp.importInvoices).toHaveBeenCalledWith({
      programmeCode: 'RF-DEMO',
    });
    expect(JSON.stringify(logs.create.mock.calls)).toContain(
      '"operation":"erp.import_invoices"',
    );
  });

  it('normalizes empty ERP import context fields before persistence', async () => {
    const { prisma } = baseRows();
    const { imports, erp } = service(prisma);

    await imports.importFromErp({
      programmeId: '',
      programmeCode: 'RF-DEMO',
      anchorId: '',
    }, 'actor-1');

    expect(erp.importInvoices).toHaveBeenCalledWith({
      programmeCode: 'RF-DEMO',
      fromDate: undefined,
      toDate: undefined,
    });
    expect(prisma.invoiceImportBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          programmeId: undefined,
          anchorId: undefined,
        }),
      }),
    );
  });

  it('implements mock ERP empty, failure and approval rules', async () => {
    const provider = new MockErpProvider();

    await expect(
      provider.importInvoices({ programmeCode: 'EMPTY-RF' }),
    ).resolves.toMatchObject({ invoices: [] });
    await expect(
      provider.importInvoices({ programmeCode: 'FAIL-RF' }),
    ).rejects.toThrow(/Mock ERP/);
    await expect(
      provider.confirmInvoiceApproval({ invoiceNumber: 'INV-UNAPPROVED' }),
    ).resolves.toMatchObject({ approved: false });
  });

  it('implements mock e-invoicing validation rules', async () => {
    const provider = new MockEInvoicingProvider();

    await expect(
      provider.validateInvoice({
        invoiceNumber: 'INV-1',
        amount: 1,
        currency: 'GHS',
        issueDate: '2026-01-01',
      }),
    ).resolves.toMatchObject({ status: 'VALIDATED' });
    await expect(
      provider.validateInvoice({
        invoiceNumber: 'INV-TAXFAIL',
        amount: 1,
        currency: 'GHS',
        issueDate: '2026-01-01',
      }),
    ).resolves.toMatchObject({ status: 'FAILED' });
    await expect(
      provider.validateInvoice({
        invoiceNumber: 'INV-TAXREVIEW',
        amount: 1,
        currency: 'GHS',
        issueDate: '2026-01-01',
      }),
    ).resolves.toMatchObject({ status: 'REFERRED' });
  });

  it('exposes invoice import permission for RBAC guards', () => {
    expect(PERMISSIONS.invoicesImport).toBe('invoices:import');
  });
});
