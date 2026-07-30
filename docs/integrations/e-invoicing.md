# E-Invoicing Preparation

Stage 8E adds an e-invoicing provider abstraction and mock tax validation. It prepares the invoice model and operational UI for future GRA/e-invoicing integration without calling a live provider.

## Provider Settings

```env
EINVOICING_PROVIDER=mock
EINVOICING_API_BASE_URL=
EINVOICING_API_KEY=
EINVOICING_WEBHOOK_SECRET=
```

## Mock Rules

- Invoice numbers containing `TAXFAIL` return `FAILED`.
- Invoice numbers containing `TAXREVIEW` return `REFERRED`.
- Other invoices return `VALIDATED` with a mock fiscal reference.

## Operational Result

Validation updates:

- `einvoicingStatus`
- `einvoicingReference`
- `einvoicingCheckedAt`
- `einvoicingResponseJson`
- `fiscalReference`
- `validationStatus`
- `validationErrors`

Failures and referrals create invoice exception workflow cases and write `einvoicing.validate_invoice` integration logs.
