# Payment Reconciliation

Confirmed provider payments create reconciliation records and ledger entries in the same database transaction.

## Auto Matching

When a payment reaches `CONFIRMED`, the service creates a reconciliation item if one does not already exist for the payment. Outbound payments use a negative statement amount; inbound collections use a positive statement amount. The record is marked `MATCHED` with full confidence.

## Ledger Posting

The service checks for existing ledger entries by `paymentId` before posting. This keeps repeated provider verification or duplicate webhooks from double-posting ledger entries.

Outbound supplier disbursement:

- Debit `2100` Supplier disbursement confirmed.
- Credit `1000` Cash disbursed to supplier.

Inbound buyer collection:

- Debit `1000` Buyer collection confirmed.
- Credit `1200` Financed receivable settled.

## Exception Handling

Failed, pending, returned, duplicate, or invalid-signature webhook events do not create final settlement ledger postings. Operators can inspect `/payments`, `/payments/:id`, and `/webhooks/payments` to review provider state and callback history.
