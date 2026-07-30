# Provider Environment Variables

This file lists external provider settings that must be reviewed before deploying Release 1.

## Storage

```env
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
```

Use `STORAGE_PROVIDER=s3` only after `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` are set in the target environment.

## Existing Mockable Providers

```env
NOTIFICATION_PROVIDER=console
EMAIL_PROVIDER=console
DEFAULT_FROM_EMAIL=no-reply@invox.local
DEFAULT_FROM_NAME=INVOX
APP_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
RESEND_API_KEY=
SMS_PROVIDER=console
WHATSAPP_PROVIDER=console
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
ERP_PROVIDER=mock
ERP_API_BASE_URL=
ERP_API_KEY=
ERP_WEBHOOK_SECRET=dev_erp_secret
EINVOICING_PROVIDER=mock
EINVOICING_API_BASE_URL=
EINVOICING_API_KEY=
EINVOICING_WEBHOOK_SECRET=dev_einvoicing_secret
PROVIDER_WEBHOOK_MAX_RETRIES=5
MAX_INVOICE_IMPORT_ROWS=5000
INVOICE_IMPORT_ALLOWED_MIME_TYPES=text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
INVOICE_IMPORT_REQUIRE_BUYER_APPROVAL=true
```

Production deployments must replace mock providers where the release scope requires live integration. Any provider change should be tested with `IntegrationLog` review and a rollback path.

## Email Provider Startup Rule

`EMAIL_PROVIDER=console` is safe for development and automated tests. If `EMAIL_PROVIDER=smtp`, the API validates that `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are present before startup completes. Keep real SMTP credentials in deployment secrets only.
