# ERP Invoice Import

Stage 8E adds the import foundation for Release 1 reverse factoring invoices. No live ERP is called unless a later release explicitly enables and configures one.

## Provider Settings

```env
ERP_PROVIDER=mock
ERP_API_BASE_URL=
ERP_API_KEY=
ERP_WEBHOOK_SECRET=
MAX_INVOICE_IMPORT_ROWS=5000
INVOICE_IMPORT_ALLOWED_MIME_TYPES=text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
INVOICE_IMPORT_REQUIRE_BUYER_APPROVAL=true
```

## Mock ERP Rules

- Programme codes containing `EMPTY` return zero invoices.
- Programme codes containing `FAIL` simulate provider failure.
- Approval confirmation returns approved unless the invoice number contains `UNAPPROVED`.
- Provider calls write `IntegrationLog` rows using `erp.import_invoices` and `erp.confirm_invoice_approval`.

## Import Flow

ERP import creates an `InvoiceImportBatch` and `InvoiceImportRow` records. Valid rows can be processed into invoices from the batch detail screen. Invalid and duplicate rows remain visible for operations review and create workflow exception cases.

Known gap: real ERP credential handling, pagination, webhooks, retry scheduling, and field mapping per ERP vendor are intentionally deferred.
