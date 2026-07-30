# File Upload Security

Release 1 document uploads are constrained at the API boundary before storage is called.

## Validation

Configured limits:

```env
MAX_UPLOAD_MB=20
ALLOWED_UPLOAD_MIME_TYPES=application/pdf,image/jpeg,image/png,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

The API rejects:

- Missing file buffers.
- Files larger than `MAX_UPLOAD_MB`.
- MIME types outside `ALLOWED_UPLOAD_MIME_TYPES`.
- Local storage keys that escape the configured storage root.

KYC/KYB document types are created as `PENDING_VERIFICATION`; other uploads are created as `ACTIVE`.

## Access Control

Document endpoints remain protected by JWT authentication and RBAC permissions:

```txt
documents:read
documents:upload
documents:update
documents:verify
documents:delete
documents:download
```

Downloads are not public API reads. The backend issues short-lived signed URLs for Spaces-backed files and records audit evidence for download URL requests.

## Operational Notes

Keep `STORAGE_PROVIDER=local` for local development unless Spaces credentials are available. In production, use `STORAGE_PROVIDER=s3`, store credentials in the deployment secret manager, and keep the Space private unless a controlled public CDN policy is approved.
