# Email Delivery Integration

Stage 8B adds production email delivery for Release 1 reverse factoring workflows while preserving console/mock providers for development.

## Providers

Development default:

```env
EMAIL_PROVIDER=console
DEFAULT_FROM_EMAIL=no-reply@invox.local
DEFAULT_FROM_NAME=INVOX
APP_URL=http://localhost:3000
```

SMTP:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
DEFAULT_FROM_EMAIL=no-reply@example.com
DEFAULT_FROM_NAME=INVOX
APP_URL=https://app.example.com
```

Do not commit SMTP credentials. Production startup fails if `EMAIL_PROVIDER=smtp` and `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASSWORD` are missing.

## Provider Notes

Google Workspace/Gmail: use an app password or Workspace SMTP relay policy. Do not use a personal mailbox password.

Amazon SES SMTP: verify the sending domain/address, move out of sandbox where required, and use SES SMTP credentials rather than AWS access keys.

Resend: `RESEND_API_KEY` is reserved in env configuration, but the package is not installed in this stage. Use console or SMTP.

## Templates

The API includes clean HTML and text templates for:

```txt
user.invited
password.reset
approval.requested
approval.approved
approval.rejected
kyc.submitted
kyc.approved
kyc.rejected
programme.approved
programme.activated
invoice.approved
financing.offer_generated
financing.accepted
payment.disbursed
collection.received
```

Templates use simple placeholders such as `{{userName}}`, `{{actionUrl}}`, `{{entityName}}`, `{{status}}`, and `{{reason}}`.

## Test Flows

Invitation email:

1. Set `EMAIL_PROVIDER=console`.
2. Sign in as a user with `users:create`.
3. Call `POST /auth/invite-user`.
4. Confirm a `NotificationLog` record is created.
5. Confirm console output masks invite token values.

Password reset:

1. Call `POST /auth/reset-password/request`.
2. Confirm the response is generic.
3. Confirm a reset notification exists only when the email matches a user.
4. Open `/reset-password?token=...` to test the placeholder form.

Notification delivery:

1. Create a notification in `/notifications`.
2. Send it.
3. Review `attempts`, `lastAttemptAt`, `providerMessageId`, `sentAt`, and `failureReason`.
4. Inspect `/integrations/logs` for `providerType=EMAIL`, `operation=email.send`.

## Known Gaps

- Invite acceptance is a placeholder page; token persistence and acceptance workflow remain future auth hardening work.
- Resend is reserved but not active because this stage keeps dependencies minimal.
- Bounce/webhook handling from SMTP/ESP providers is not implemented yet.
