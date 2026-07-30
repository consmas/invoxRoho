# INVOX

INVOX is a Supply Chain Finance platform. Release 1 focuses on Reverse Factoring / Approved Payables Finance.

Current stage: Stage 8E, ERP invoice import and e-invoicing preparation.

## Stack

- Frontend: Next.js + TypeScript
- Main backend: NestJS + TypeScript
- Core engines: Go
- Database: PostgreSQL 16
- ORM: Prisma 7+
- Cache/queue: Redis + BullMQ
- Local infrastructure: Docker Compose
- API style: REST/JSON

## Folder Structure

```txt
apps/api                  NestJS API
apps/web                  Next.js frontend placeholder
services/pricing-engine   Go pricing engine
services/credit-engine    Future credit and limits engine
services/funding-engine   Future funding allocation engine
services/ledger-engine    Future ledger engine
packages/shared-types     Shared TypeScript types
packages/api-contracts    API contracts
packages/events           Event definitions
infrastructure/docker     Local Docker Compose
docs                      Architecture and product docs
```

## Local Setup

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
cd apps/api
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run seed:auth
npm run start:dev
```

Run the frontend:

```bash
cd apps/web
npm install
npm run dev
```

Run the pricing engine:

```bash
cd services/pricing-engine
go mod tidy
go run main.go
```

## Environment Variables

API defaults live in `apps/api/.env`.

```env
APP_NAME=INVOX
APP_ENV=development
APP_PORT=3001
DATABASE_URL="postgresql://invox_user:invox_password@localhost:5432/invox_dev?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change_this_in_dev
JWT_EXPIRES_IN=1d
PRICING_ENGINE_URL=http://localhost:4001
CREDIT_ENGINE_URL=http://localhost:4002
FUNDING_ENGINE_URL=http://localhost:4003

# Storage
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage
S3_ENDPOINT=https://sfo3.digitaloceanspaces.com
S3_REGION=sfo3
S3_BUCKET=invox-bucket
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_BASE_URL=https://invox-bucket.sfo3.digitaloceanspaces.com
MAX_UPLOAD_MB=20
ALLOWED_UPLOAD_MIME_TYPES=application/pdf,image/jpeg,image/png,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document
SIGNED_URL_EXPIRY_SECONDS=300

# Notifications
NOTIFICATION_PROVIDER=console
EMAIL_PROVIDER=console
SMS_PROVIDER=console
WHATSAPP_PROVIDER=console
DEFAULT_FROM_EMAIL=no-reply@invox.local
DEFAULT_FROM_NAME=INVOX
APP_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
RESEND_API_KEY=

# KYC / Screening
KYC_PROVIDER=mock
KYB_PROVIDER=mock
SCREENING_PROVIDER=mock
ADVERSE_MEDIA_PROVIDER=mock
CREDIT_BUREAU_PROVIDER=mock
KYC_API_BASE_URL=
KYC_API_KEY=
KYC_WEBHOOK_SECRET=
SCREENING_API_BASE_URL=
SCREENING_API_KEY=
SCREENING_WEBHOOK_SECRET=
KYC_AUTO_APPROVE_CLEAR_RESULTS=false
SCREENING_REVIEW_REQUIRED_ON_MATCH=true
KYC_RESCHEDULE_DAYS=365
SCREENING_RESCHEDULE_DAYS=90

# Payment provider
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

# ERP / Invoice Import
ERP_PROVIDER=mock
ERP_API_BASE_URL=
ERP_API_KEY=
ERP_WEBHOOK_SECRET=dev_erp_secret

# E-Invoicing / Tax validation
EINVOICING_PROVIDER=mock
EINVOICING_API_BASE_URL=
EINVOICING_API_KEY=
EINVOICING_WEBHOOK_SECRET=dev_einvoicing_secret
PROVIDER_WEBHOOK_MAX_RETRIES=5

# Invoice import settings
MAX_INVOICE_IMPORT_ROWS=5000
INVOICE_IMPORT_ALLOWED_MIME_TYPES=text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
INVOICE_IMPORT_REQUIRE_BUYER_APPROVAL=true

# Webhooks
WEBHOOK_SIGNING_SECRET=dev_webhook_secret
WEBHOOK_MAX_RETRIES=5
WEBHOOK_RETRY_DELAY_SECONDS=60
```

Default local admin after `npm run seed:auth`:

```txt
Email: admin@invox.local
Password: ChangeMe123!
Role: PLATFORM_ADMIN
```

Current seeded admin password is controlled by `SEED_ADMIN_PASSWORD`; local default is:

```txt
Email: admin@invox.local
Password: Admin@12345
```

Web defaults live in `apps/web/.env.local`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Docker

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
docker compose -f infrastructure/docker/docker-compose.yml ps
docker compose -f infrastructure/docker/docker-compose.yml down
```

The compose file runs `postgres`, `redis`, `api`, and `pricing-engine`. For early development, running API and pricing manually is also supported.

## Payment Sandbox

Release 1 payment integration is sandbox-only. See:

- `docs/integrations/payments.md`
- `docs/payments/payment-lifecycle.md`
- `docs/security/payment-controls.md`
- `docs/reconciliation/payment-reconciliation.md`

## Invoice Import

Stage 8E adds CSV, Excel, JSON/API and mock ERP invoice imports, batch review, row-level validation, duplicate checks, buyer approval import and mock e-invoicing validation. See:

- `docs/invoices/import-guide.md`
- `docs/integrations/erp-invoice-import.md`
- `docs/integrations/e-invoicing.md`
- `docs/templates/invoice-import-template.csv`

## Prisma

Prisma 7 uses `apps/api/prisma.config.ts` for the datasource URL. Do not add `url = env("DATABASE_URL")` to `schema.prisma`.

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
npm run seed:auth
npm run seed:demo
```

## Tests

API:

```bash
cd apps/api
npm run lint
npm run build
npm test -- --runInBand
npm run test:release1-flow
npx prisma migrate status
```

Web:

```bash
cd apps/web
npm run lint
npm run build
```

Email provider setup is documented in `docs/integrations/email.md`.
KYC/KYB and screening setup is documented in `docs/integrations/kyc-kyb-screening.md`.

Go engines:

```bash
cd services/pricing-engine && go test ./...
cd services/credit-engine && go test ./...
cd services/funding-engine && go test ./...
```

## Demo Data

```bash
cd apps/api
npm run seed:auth
npm run seed:demo
```

Demo users use `Demo@12345` unless `DEMO_USER_PASSWORD` is set. The demo script is in `docs/demo/release-1-demo-script.md`.

## Health Checks

```bash
curl http://localhost:3001/health
curl http://localhost:4001/health
```

## Release 1 QA Docs

- Traceability: `docs/qa/release-1-traceability-matrix.md`
- UAT scripts: `docs/qa/uat-release-1.md`
- Frontend smoke checklist: `docs/qa/frontend-smoke-checklist.md`
- Release checklist: `docs/qa/release-readiness-checklist.md`
- Security checklist: `docs/security/release-1-security-checklist.md`
- Performance baseline: `docs/qa/performance-baseline.md`
- Staging deployment: `docs/deployment/staging-deployment.md`

## Known Gaps

- Real KYC, payment, notification, S3, ERP, and e-invoicing providers are not connected.
- MFA/SSO and rate limiting are deferred.
- Browser automation is documented as a smoke checklist; Playwright is not installed.
- Bank statement import and full reconciliation workflow need a later hardening pass.

## Pricing Engine Test

```bash
curl -X POST http://localhost:4001/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceAmount": 100000,
    "annualRate": 0.24,
    "offerDate": "2026-07-08",
    "invoiceDueDate": "2026-08-07",
    "platformFeeFlat": 100,
    "platformFeePercent": 0
  }'
```

## API Flow Test

```bash
ANCHOR_ID=$(curl -s -X POST http://localhost:3001/counterparties -H "Content-Type: application/json" -d '{"type":"ANCHOR","legalName":"Anchor Ghana Ltd"}' | jq -r .id)
SUPPLIER_ID=$(curl -s -X POST http://localhost:3001/counterparties -H "Content-Type: application/json" -d '{"type":"SUPPLIER","legalName":"Supplier Ghana Ltd"}' | jq -r .id)
FUNDER_ID=$(curl -s -X POST http://localhost:3001/counterparties -H "Content-Type: application/json" -d '{"type":"FUNDER","legalName":"Funder Ghana Ltd"}' | jq -r .id)

PROGRAMME_ID=$(curl -s -X POST http://localhost:3001/programmes -H "Content-Type: application/json" -d "{\"name\":\"Anchor RF Programme\",\"code\":\"RF-001\",\"anchorId\":\"$ANCHOR_ID\",\"currency\":\"GHS\",\"annualDiscountRate\":0.24,\"platformFeeFlat\":100,\"platformFeePercent\":0}" | jq -r .id)

curl -X POST "http://localhost:3001/programmes/$PROGRAMME_ID/participants" -H "Content-Type: application/json" -d "{\"counterpartyId\":\"$SUPPLIER_ID\",\"participantType\":\"SUPPLIER\"}"
curl -X POST "http://localhost:3001/programmes/$PROGRAMME_ID/participants" -H "Content-Type: application/json" -d "{\"counterpartyId\":\"$FUNDER_ID\",\"participantType\":\"FUNDER\"}"

INVOICE_ID=$(curl -s -X POST http://localhost:3001/invoices -H "Content-Type: application/json" -d "{\"programmeId\":\"$PROGRAMME_ID\",\"buyerId\":\"$ANCHOR_ID\",\"supplierId\":\"$SUPPLIER_ID\",\"invoiceNumber\":\"INV-001\",\"amount\":100000,\"issueDate\":\"2026-07-08\",\"dueDate\":\"2026-08-07\"}" | jq -r .id)

curl -X POST "http://localhost:3001/invoices/$INVOICE_ID/approve"
OFFER_ID=$(curl -s -X POST "http://localhost:3001/financing/offers/from-invoice/$INVOICE_ID" | jq -r .id)
curl -X POST "http://localhost:3001/financing/$OFFER_ID/accept"
```
