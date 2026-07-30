# Frontend Smoke Checklist

Automated browser testing is not configured in `apps/web`; use this checklist until Playwright is introduced.

| Screen | Check | Expected result |
|---|---|---|
| `/login` | Login with seeded admin | Redirects to dashboard with sidebar. |
| `/dashboard` | Load KPI cards | No hydration/runtime error. |
| `/counterparties` | List, create, view detail | Table and forms render. |
| `/programmes` | List, create, view detail | Programme limits/rules visible. |
| `/invoices` | List, create, approve, view | Actions are visible by permission. |
| `/financing` | List, view, lifecycle actions | Ledger/payments/obligations visible. |
| `/approvals` | List/detail | Approval status and actions render. |
| `/reports` | Open page | Report content renders. |
| `/operations` | Switch resources | JSON records and dashboard metrics render. |
| `/users`, `/roles` | Admin access | User/role pages render for admin. |
| `/documents` | Upload/list/detail | Upload form and records render. |
| `/notifications` | Create/send | Notification records and actions render. |
| `/integrations/connections` | Create/test | Credentials are not displayed. |
| `/integrations/logs` | View log detail | Masked payloads are shown. |
| `/webhooks/endpoints` | Create endpoint | Endpoint appears in list. |
| `/webhooks/deliveries` | View/retry/cancel | Delivery actions render. |
