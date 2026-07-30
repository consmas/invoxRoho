# Invoice Import Guide

Invoice import supports CSV, Excel, JSON/API payloads, and mock ERP import for Release 1 approved payables finance.

## CSV and Excel Format

Use `docs/templates/invoice-import-template.csv` as the canonical column set:

```txt
programmeCode,buyerRegistrationNumber,supplierRegistrationNumber,buyerTin,supplierTin,invoiceNumber,externalReference,amount,currency,issueDate,dueDate,purchaseOrderNumber,grnNumber,taxAmount,description,buyerApproved,buyerApprovalReference
```

Excel imports use the same headers in the first worksheet. Dates should be ISO format where possible.

## JSON Example

```json
{
  "programmeCode": "RF-DEMO",
  "invoices": [
    {
      "invoiceNumber": "JSON-INV-1001",
      "supplierRegistrationNumber": "SUPPLIER-001",
      "amount": 12000,
      "currency": "GHS",
      "issueDate": "2026-01-15",
      "dueDate": "2026-03-15",
      "buyerApproved": true,
      "buyerApprovalReference": "JSON-APP-1001"
    }
  ]
}
```

## Validation Rules

- Programme must exist.
- Buyer must be an anchor and match the programme anchor.
- Supplier must exist and be an active supplier participant in the programme.
- Invoice number, currency, valid issue date and valid due date are required.
- Amount must be greater than zero.
- Due date must be after issue date.
- Duplicate invoices are blocked.
- Buyer approval is required before an invoice is financeable.

## Duplicate Detection

The import service blocks:

- Same buyer, supplier and invoice number.
- Duplicate external reference.
- Same supplier, amount, due date and similar invoice number prefix.

## Exception Queue

Rows with invalid, duplicate or failed status are visible at `/invoices/exceptions`. Import errors also create workflow cases for operations review with reasons such as `INVALID_ROW`, `DUPLICATE_INVOICE`, `MISSING_SUPPLIER`, `SUPPLIER_NOT_IN_PROGRAMME`, `BUYER_MISMATCH`, `EINVOICING_FAILED`, and `APPROVAL_MISSING`.

Known gap: real ERP/GRA integrations, vendor-specific mappings, retry queues and signed provider webhooks remain deferred.
