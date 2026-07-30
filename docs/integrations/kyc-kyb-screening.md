# KYC, KYB And Screening Integration

Stage 8C adds the compliance verification layer for Release 1 reverse factoring counterparties and UBO records.

## Providers

Development defaults:

```env
KYC_PROVIDER=mock
KYB_PROVIDER=mock
SCREENING_PROVIDER=mock
ADVERSE_MEDIA_PROVIDER=mock
KYC_RESCHEDULE_DAYS=365
SCREENING_RESCHEDULE_DAYS=90
```

Reserved future real-provider settings:

```env
KYC_API_BASE_URL=
KYC_API_KEY=
KYC_WEBHOOK_SECRET=
SCREENING_API_BASE_URL=
SCREENING_API_KEY=
SCREENING_WEBHOOK_SECRET=
```

Do not commit provider credentials. Real provider adapters should be selected by env/config when implemented.

## Mock Provider Behavior

KYB:

- `legalName` containing `FAIL` returns `FAILED`.
- `registrationNumber` or `tin` containing `REVIEW` returns `REFERRED` and requires review.
- Otherwise returns `VERIFIED`.

KYC:

- `fullName` containing `FAIL` returns `FAILED`.
- `idNumber` containing `REVIEW` returns `REFERRED` and requires review.
- Otherwise returns `VERIFIED`.

Screening:

- Name containing `SANCTION` returns a sanctions `MATCH`, `CRITICAL`.
- Name containing `PEP` returns a PEP `MATCH`, `HIGH`.
- Name containing `ADVERSE` returns an adverse-media `MATCH`, `MEDIUM`.
- Otherwise returns `CLEAR`.

## API

Counterparties:

```txt
POST /counterparties/:id/run-kyb
POST /counterparties/:id/run-screening
POST /counterparties/:id/run-full-compliance-check
```

UBOs:

```txt
POST /ubo-records/:id/run-kyc
POST /ubo-records/:id/run-screening
POST /ubo-records/:id/run-full-compliance-check
```

Compliance:

```txt
GET  /compliance/checks
GET  /compliance/checks/:id
POST /compliance/checks/:id/review
POST /compliance/checks/:id/expire
GET  /compliance/review-queue
GET  /compliance/summary
GET  /reports/compliance/summary
```

Every provider call creates a `ComplianceCheck`, an `IntegrationLog`, and an audit entry. Matches create a `WorkflowCase` assigned to the compliance queue.
