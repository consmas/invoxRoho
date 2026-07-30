# DigitalOcean Spaces Document Storage

INVOX supports local filesystem storage and DigitalOcean Spaces through the S3-compatible AWS SDK v3 client.

## Provider Selection

Local storage remains the default for development:

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage
```

To use DigitalOcean Spaces:

```env
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://sfo3.digitaloceanspaces.com
S3_REGION=sfo3
S3_BUCKET=invox-bucket
S3_ACCESS_KEY_ID=<spaces-access-key>
S3_SECRET_ACCESS_KEY=<spaces-secret-key>
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_BASE_URL=https://invox-bucket.sfo3.digitaloceanspaces.com
SIGNED_URL_EXPIRY_SECONDS=300
```

Do not commit Spaces access keys. Keep them in the deployment secret store or local `.env`.

## Object Layout

Documents are written under deterministic business folders:

```txt
counterparties/{counterpartyId}/...
programmes/{programmeId}/...
invoices/{invoiceId}/...
financing/{financingTransactionId}/...
general/...
```

Object names are sanitized and prefixed with a timestamp plus UUID. Metadata stored in Postgres includes `fileKey`, `fileUrl`, `mimeType`, `sizeBytes`, `checksum`, `storageProvider`, status and linked entity IDs.

## Download Flow

`GET /documents/:id/download-url` returns:

```json
{
  "downloadUrl": "https://invox-bucket.sfo3.digitaloceanspaces.com/...",
  "expiresInSeconds": 300
}
```

For local storage, the same endpoint returns the API download route and `expiresInSeconds: null`.

`GET /documents/:id/download` returns a signed URL JSON response for S3-backed documents and streams the file directly for local-backed documents.

## Audit And Integration Logs

Document upload, download URL creation and soft delete write audit evidence. Storage provider calls also write `IntegrationLog` records using:

```txt
providerType=STORAGE
providerKey=digitalocean_spaces | local
operation=storage.upload | storage.download_url | storage.delete
```

Failed uploads are logged with masked/sanitized error details before the API returns `400 Document upload failed`.
