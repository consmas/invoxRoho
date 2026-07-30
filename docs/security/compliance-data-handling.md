# Compliance Data Handling

Compliance checks may contain identity, registry and screening data. Treat provider requests and responses as regulated operational evidence.

## Storage

`ComplianceCheck` stores:

- Normalized result fields for workflow and reporting.
- Raw provider response in `responseJson`.
- Request snapshot in `requestJson`.
- Review decision, reviewer, notes and timestamps.

Integration logs use the existing masking helper for secrets, tokens and credentials. Do not store real provider API keys in request or response payloads.

## Frontend Exposure

Frontend pages show operational fields needed for review: check type, entity, provider, normalized result, risk level, reason, review state and timestamps. Raw JSON appears on the detail page for authorized compliance users only through `compliance:read`.

## Known Gaps

- No real KYC/KYB provider adapter is active yet.
- No inbound provider webhook verification is implemented yet.
- Director-specific endpoints are not separate yet; UBO screening paths cover beneficial-owner records in this stage.
