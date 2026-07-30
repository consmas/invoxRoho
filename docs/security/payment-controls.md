# Payment Controls

Release 1 payment controls are designed for sandbox execution and auditability.

## Live Payment Lock

The API rejects live payment mode at startup unless all live credentials are present and `ENABLE_LIVE_PAYMENTS=true`. This prevents accidental production payment execution from local or staging environments.

## Permissions

Payment operations require explicit permissions:

- `payments:initiate_provider`
- `payments:verify_provider`
- `payments:return`
- `payments:approve`
- `payments:submit_for_approval`
- `payments:webhook_read`
- `webhooks:payments_receive`

Legacy aliases map `payment.disburse` to `financing:mark_disbursed` and `payments:initiate_provider`, and `payment.approve` to `payments:confirm` and `payments:approve`.

## Audit and Idempotency

Provider initiation stores a unique `idempotencyKey`; duplicate initiation returns the existing provider state instead of creating a second provider payment. Payment changes write audit records, and provider requests/responses are captured through masked integration logs.

Inbound sandbox webhooks persist `PaymentWebhookEvent` records with a unique `eventReference`. Invalid signatures are stored and flagged but do not mutate payment status.
