# Release 1 UAT Scripts

Use seeded demo data where possible. Record pass/fail notes beside each step.

## Platform Administrator
Objective: Confirm platform setup, RBAC, integrations, and audit visibility.
Preconditions: `npm run seed:auth` and `npm run seed:demo` completed.
Steps: login as `admin@invox.local`; open dashboard; open Users, Roles, Integrations, Webhooks, Audit/Reports; create and test a mock integration connection.
Expected result: admin can access all areas, no credentials are exposed, audit/log records are visible.
Pass/fail notes:

## Relationship Manager
Objective: Onboard anchor/supplier and structure programme.
Preconditions: relationship manager user exists.
Steps: login; create counterparty; submit KYC data; create programme; add supplier and funder participants.
Expected result: records are created and visible in pipeline.
Pass/fail notes:

## Compliance Officer
Objective: Execute KYB/screening and review documents.
Preconditions: counterparty exists with document uploaded.
Steps: run KYB; run screening; verify a document; reject another document with reason; approve/reject KYC.
Expected result: statuses update, rejection reason persists, workflow case appears for matches.
Pass/fail notes:

## Credit/Risk Officer
Objective: Review limits and exposure.
Preconditions: programme and invoice exist.
Steps: open operations limits; confirm active limit records; generate/accept offer within limit; try over-limit offer.
Expected result: valid offer reserves exposure; over-limit flow is rejected.
Pass/fail notes:

## Operations Analyst
Objective: Process invoices and operational queues.
Preconditions: programme participants exist.
Steps: create invoice; validate invoice data; approve invoice if permitted; view operations dashboard.
Expected result: invoice appears with correct status and operations metrics update.
Pass/fail notes:

## Finance/Treasury User
Objective: Fund, disburse, collect, and verify ledger/reconciliation.
Preconditions: accepted financing offer exists.
Steps: fund offer; mark disbursed; verify outbound payment; mark collected; close financing; review ledger and reconciliation.
Expected result: funding allocation, payment, ledger, collection, reconciliation, and exposure release are correct.
Pass/fail notes:

## Anchor/Buyer User
Objective: Approve payables and view obligations.
Preconditions: anchor user linked to buyer.
Steps: login; view invoices; approve payable; view programme dashboard/report.
Expected result: anchor can only access relevant buyer records and approval actions.
Pass/fail notes:

## Supplier User
Objective: Accept early payment offer.
Preconditions: supplier invoice has generated offer.
Steps: login; view invoices/financing; accept offer; verify status changes.
Expected result: accepted offer moves to funding queue.
Pass/fail notes:

## Funder User
Objective: Review fundable assets and participation.
Preconditions: funder participant exists.
Steps: login; view financing; confirm allocation/report visibility.
Expected result: funder sees relevant assets and returns data.
Pass/fail notes:

## Auditor/Regulator Read-only User
Objective: Verify read-only audit access.
Preconditions: auditor user exists.
Steps: login; open reports, documents, integrations logs, audit trail; try create/update action.
Expected result: reads succeed, writes are denied.
Pass/fail notes:
