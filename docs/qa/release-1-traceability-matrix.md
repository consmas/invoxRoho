# Release 1 Traceability Matrix

Status values: Implemented, Partial, Not Started, Deferred.

| Requirement ID | Requirement summary | Status | Backend endpoint/module | Frontend screen | Test coverage | Notes/gaps |
|---|---|---:|---|---|---|---|
| FR-ONB | Counterparty onboarding and KYC/KYB data capture | Partial | `CounterpartiesModule`, `/counterparties`, `/run-kyb`, `/run-screening` | `/counterparties` | Unit smoke, manual UAT | External KYC providers are mock only. |
| FR-CFG | Programme/product configuration for reverse factoring | Implemented | `ProgrammesModule`, `/programmes` | `/programmes` | Build, UAT | Future products remain deferred. |
| FR-CPM | Counterparty participant management | Implemented | `/programmes/:id/participants` | Programme detail | Manual UAT | Bulk upload not implemented. |
| FR-INV | Invoice creation, validation, approval | Implemented | `InvoicesModule`, `/invoices` | `/invoices` | API smoke, UAT | E-invoicing provider is mock. |
| FR-APF | Approved payable financing offer lifecycle | Implemented | `FinancingModule`, `/financing` | `/financing` | API lifecycle smoke | Requires pricing engine running. |
| FR-CRE | Credit limits and exposure controls | Implemented | `LimitRecord`, `ExposureSnapshot`, financing service | `/operations` | Stage 6 lifecycle smoke | Advanced credit scoring remains basic. |
| FR-PRC | Pricing calculation | Implemented | Pricing engine, `EnginesService` | Financing offer views | Go tests | Pricing engine must be deployed with API. |
| FR-FND | Funding allocation | Implemented | `/financing/:id/fund`, `FundingAllocation` | Financing detail | Stage 7 funding-engine baseline | Advanced funder waterfall deferred. |
| FR-PAY | Disbursement/payment records | Partial | `/financing/:id/disburse`, `/payments/*` | Financing detail, operations | Unit smoke | Real payment provider is mock. |
| FR-COL | Collection marking | Implemented | `/financing/:id/collect` | Financing detail | Lifecycle smoke | Partial collections need more product rules. |
| FR-GLA | Ledger posting and balance checks | Implemented | `LedgerEntry`, financing service | Financing detail, operations | Lifecycle smoke | No separate immutable journal header yet. |
| FR-REC | Reconciliation matching | Partial | `ReconciliationItem`, operations API | `/operations` | Lifecycle smoke | Bank statement import is not implemented. |
| FR-DOC | Document storage and verification | Implemented | `DocumentsModule`, `StorageModule` | `/documents` | Stage 8 storage tests | Local and DigitalOcean Spaces providers are wired; live Spaces use requires credentials. |
| FR-WKF | Maker-checker approvals | Implemented | `ApprovalsModule` | `/approvals` | Self-approval test | Some frontend actions still call direct workflow APIs. |
| FR-NOT | Notifications | Partial | `NotificationsModule` | `/notifications` | Stage 6 smoke | Console/mock providers only. |
| FR-RPT | Reports/dashboard | Partial | `/operations/dashboard`, reports definitions | `/dashboard`, `/reports` | Build, UAT | Export/scheduling incomplete. |
| NFR-SEC | Authentication, RBAC, credential safety | Partial | `AuthModule`, guards, integration sanitization | Login, admin pages | Permission/self-approval tests | MFA/SSO/rate limiting deferred. |
| NFR-CMP | Compliance evidence and auditability | Partial | Audit logs, KYC/screening, docs | Counterparty, documents, audit | UAT | Regulatory report filing not implemented. |
| NFR-AUD | Audit logging | Implemented | `AuditService`, `/audit` | Reports/audit-ready views | Unit smoke | DB-level immutability not enforced. |
| NFR-PRF | Performance baseline | Partial | Health and core endpoints | All core screens | Manual baseline doc | Automated load testing deferred. |
| NFR-AVL | Availability/staging readiness | Partial | Health checks, Docker Compose | N/A | Deployment checklist | HA, backups, monitoring need staging infra. |
