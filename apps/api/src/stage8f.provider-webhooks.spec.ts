import { InvoiceStatus } from '@prisma/client';
import { InvoiceImportService } from './invoices/invoice-import.service';

function service(prisma: Record<string, unknown>) {
  const logs = { create: jest.fn().mockResolvedValue({ id: 'log-1' }) };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const notifications = {
    createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  return {
    imports: new InvoiceImportService(
      prisma as never,
      audit as never,
      logs as never,
      notifications as never,
      { importInvoices: jest.fn(), confirmInvoiceApproval: jest.fn() } as never,
      { validateInvoice: jest.fn() } as never,
      {
        get: jest.fn((key: string) => {
          const values: Record<string, string> = {
            ERP_WEBHOOK_SECRET: 'erp-secret',
            EINVOICING_WEBHOOK_SECRET: 'einvoicing-secret',
            PROVIDER_WEBHOOK_MAX_RETRIES: '3',
            MAX_INVOICE_IMPORT_ROWS: '5000',
          };
          return values[key];
        }),
      } as never,
    ),
    logs,
    audit,
    notifications,
  };
}

function prismaBase() {
  const invoice = {
    id: 'invoice-1',
    invoiceNumber: 'INV-1',
    externalReference: 'EXT-1',
    status: InvoiceStatus.RECEIVED,
    fiscalReference: null,
  };
  return {
    providerWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'event-1',
          attempts: 0,
          maxAttempts: 3,
          ...data,
        }),
      ),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'event-1', ...data }),
        ),
      findMany: jest.fn().mockResolvedValue([]),
    },
    invoice: {
      findUnique: jest.fn().mockResolvedValue(invoice),
      findFirst: jest.fn().mockResolvedValue(invoice),
      update: jest
        .fn()
        .mockResolvedValue({ ...invoice, status: InvoiceStatus.APPROVED }),
    },
    workflowCase: {
      create: jest.fn().mockResolvedValue({ id: 'workflow-1' }),
    },
    invoiceImportBatch: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    invoiceImportRow: {
      create: jest.fn(),
    },
  };
}

describe('Stage 8F provider webhook hardening', () => {
  it('records invalid ERP signatures without mutating invoices', async () => {
    const prisma = prismaBase();
    const { imports, logs } = service(prisma);

    const result = await imports.processErpWebhook(
      {
        eventReference: 'evt-invalid',
        eventType: 'erp.approval',
        invoiceId: 'invoice-1',
      },
      'wrong',
    );

    expect(result).toMatchObject({ signatureValid: false });
    expect(prisma.invoice.update).not.toHaveBeenCalled();
    expect(JSON.stringify(logs.create.mock.calls)).toContain(
      '"status":"FAILED"',
    );
  });

  it('deduplicates callbacks by event reference', async () => {
    const prisma = prismaBase();
    prisma.providerWebhookEvent.findUnique.mockResolvedValue({
      id: 'existing-event',
    });
    const { imports } = service(prisma);

    const result = await imports.processErpWebhook(
      {
        eventReference: 'evt-1',
        eventType: 'erp.approval',
        invoiceId: 'invoice-1',
      },
      'erp-secret',
    );

    expect(result).toEqual({
      duplicate: true,
      event: { id: 'existing-event' },
    });
    expect(prisma.providerWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('matches ERP approval callbacks to invoices and marks reconciliation matched', async () => {
    const prisma = prismaBase();
    prisma.providerWebhookEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'event-1',
        providerType: 'ERP',
        providerKey: 'mock',
        payloadJson: {
          eventType: 'erp.approval',
          invoiceId: 'invoice-1',
          approvalReference: 'APP-1',
        },
        attempts: 0,
        maxAttempts: 3,
      });
    const { imports, audit } = service(prisma);

    const result = await imports.processErpWebhook(
      {
        eventReference: 'evt-approval',
        eventType: 'erp.approval',
        invoiceId: 'invoice-1',
        approvalReference: 'APP-1',
      },
      'erp-secret',
    );

    expect(JSON.stringify(prisma.invoice.update.mock.calls)).toContain(
      '"buyerApprovalSource":"ERP_WEBHOOK"',
    );
    expect(
      JSON.stringify(prisma.providerWebhookEvent.update.mock.calls),
    ).toContain('"reconciliationStatus":"MATCHED"');
    expect(JSON.stringify(audit.log.mock.calls)).toContain(
      'ERP approval callback processed',
    );
    expect(result).toHaveProperty('event');
  });

  it('marks e-invoicing failure callbacks as mismatched and creates exceptions', async () => {
    const prisma = prismaBase();
    prisma.providerWebhookEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'event-1',
        providerType: 'EINVOICING',
        providerKey: 'mock',
        payloadJson: {
          eventType: 'einvoicing.status',
          invoiceId: 'invoice-1',
          status: 'FAILED',
          reason: 'Rejected',
        },
        attempts: 0,
        maxAttempts: 3,
      });
    const { imports } = service(prisma);

    await imports.processEInvoicingWebhook(
      {
        eventReference: 'evt-tax',
        eventType: 'einvoicing.status',
        invoiceId: 'invoice-1',
        status: 'FAILED',
        reason: 'Rejected',
      },
      'einvoicing-secret',
    );

    expect(
      JSON.stringify(prisma.providerWebhookEvent.update.mock.calls),
    ).toContain('"reconciliationStatus":"MISMATCHED"');
    expect(prisma.workflowCase.create).toHaveBeenCalled();
  });

  it('retries stored provider callbacks by replaying payloads', async () => {
    const prisma = prismaBase();
    prisma.providerWebhookEvent.findUnique
      .mockResolvedValueOnce({
        id: 'event-1',
        providerType: 'ERP',
        providerKey: 'mock',
        payloadJson: { eventType: 'erp.approval', invoiceId: 'invoice-1' },
        attempts: 1,
        maxAttempts: 3,
      })
      .mockResolvedValueOnce({
        id: 'event-1',
        providerType: 'ERP',
        providerKey: 'mock',
        payloadJson: { eventType: 'erp.approval', invoiceId: 'invoice-1' },
        attempts: 1,
        maxAttempts: 3,
      });
    const { imports } = service(prisma);

    await imports.retryProviderWebhookEvent('event-1');

    expect(
      JSON.stringify(prisma.providerWebhookEvent.update.mock.calls),
    ).toContain('"status":"RETRYING"');
    expect(
      JSON.stringify(prisma.providerWebhookEvent.update.mock.calls),
    ).toContain('"status":"PROCESSED"');
  });
});
