# Payment Lifecycle

Payments start as internal records created by financing or operations users. Release 1 supports outbound supplier disbursement and inbound buyer collection records, both routed through the sandbox provider.

## States

- `INITIATED`: payment exists but has not been submitted to a provider.
- `SENT`: provider initiation succeeded but final confirmation is pending.
- `CONFIRMED`: provider or operations confirmed settlement.
- `FAILED`: provider or operations failed the payment.
- `RETURNED`: settled payment was returned or reversed.

## Controlled Actions

- Submit for approval records maker-checker intent in payment metadata.
- Approve stamps `approvedById` and `approvedAt`.
- Initiate provider payment generates or reuses an idempotency key.
- Verify provider payment checks provider state by provider reference.
- Confirm posts ledger and reconciliation entries once.
- Fail and return retain failure or reversal reasons.

Confirmed outbound payments post supplier disbursement ledger entries and move related financing to `DISBURSED`. Confirmed inbound payments post collection ledger entries and move related financing to `COLLECTED`.
