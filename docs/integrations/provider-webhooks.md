# Provider Webhook Hardening

Stage 8F adds hardened inbound provider callback processing for mock ERP and e-invoicing callbacks. These endpoints are public at the authentication layer because external providers do not send user JWTs, but each callback requires the provider webhook secret.

## Endpoints

- `POST /webhooks/providers/erp`
- `POST /webhooks/providers/einvoicing`
- `GET /invoices/provider-webhook-events`
- `GET /invoices/provider-webhook-events/:id`
- `POST /invoices/provider-webhook-events/:id/retry`
- `GET /invoices/provider-reconciliation`

Provider callbacks are stored in `ProviderWebhookEvent` with:

- unique `eventReference`
- signature validity
- processing status
- attempts and retry metadata
- matched entity type/id
- reconciliation status and notes

## Secrets

```env
ERP_WEBHOOK_SECRET=dev_erp_secret
EINVOICING_WEBHOOK_SECRET=dev_einvoicing_secret
PROVIDER_WEBHOOK_MAX_RETRIES=5
```

Send the secret in `X-INVOX-Signature` for local mock callbacks.

## Processing Rules

- Duplicate `eventReference` values are ignored and returned as duplicates.
- Invalid signatures are persisted as failed events and do not mutate invoices.
- ERP approval callbacks match invoices by `invoiceId`, `invoiceNumber`, or `externalReference`.
- ERP invoice callbacks create `WEBHOOK` import batches for operations review.
- E-invoicing callbacks update invoice e-invoicing status and fiscal references.
- Failed or referred e-invoicing callbacks create invoice exception workflow cases.

## Retry and Reconciliation

Operations users can retry a stored callback from `/webhooks/providers/:id`. Successful replay marks the event `PROCESSED`; failed replay increments attempts and schedules `nextAttemptAt` until `PROVIDER_WEBHOOK_MAX_RETRIES` is reached.

Reconciliation state:

- `MATCHED`: callback matched and applied cleanly.
- `MISMATCHED`: callback matched but resulted in an operational exception.
- `UNMATCHED`: callback could not be matched or processed.
