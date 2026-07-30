# Payment Provider Integration

Release 1 supports sandbox payment-provider integration for reverse factoring only. The integration layer is intentionally provider-agnostic, but live money movement is disabled until a later controlled release.

## Environment

```env
PAYMENT_PROVIDER=sandbox
PAYMENT_MODE=sandbox
PAYMENT_WEBHOOK_SECRET=dev_payment_secret
SANDBOX_PAYMENT_AUTO_SUCCESS=true
SANDBOX_PAYMENT_FAILURE_REFERENCE_PREFIX=FAIL
SANDBOX_PAYMENT_PENDING_REFERENCE_PREFIX=PENDING
PAYMENT_API_BASE_URL=
PAYMENT_API_KEY=
PAYMENT_API_SECRET=
PAYMENT_CALLBACK_URL=
PAYMENT_WEBHOOK_URL=
ENABLE_LIVE_PAYMENTS=false
```

The API fails startup when `PAYMENT_MODE=live` unless `ENABLE_LIVE_PAYMENTS=true` and live credentials are configured. The sandbox provider makes no external API calls.

## Sandbox Behavior

- Amounts less than or equal to zero fail.
- References starting with `FAIL` fail.
- References starting with `PENDING` remain pending and map to internal `SENT`.
- Other references confirm automatically when `SANDBOX_PAYMENT_AUTO_SUCCESS=true`; otherwise they map to provider initiated/internal `SENT`.

## API Surface

- `GET /payments`
- `POST /payments`
- `GET /payments/:id`
- `PATCH /payments/:id`
- `POST /payments/:id/submit-for-approval`
- `POST /payments/:id/approve`
- `POST /payments/:id/initiate-provider-payment`
- `POST /payments/:id/verify-provider-payment`
- `POST /payments/:id/confirm`
- `POST /payments/:id/fail`
- `POST /payments/:id/return`
- `GET /payments/webhook-events`
- `GET /payments/webhook-events/:id`
- `POST /webhooks/payments/sandbox`

Provider operations write integration logs using `payment.initiate`, `payment.verify`, and `payment.webhook`.
