# Release 1 Performance Baseline

Initial targets for staging smoke/load checks:

| Operation | Target p95 | Notes |
|---|---:|---|
| Login response | < 500 ms | Excludes cold start. |
| Dashboard load API | < 800 ms | `/operations/dashboard`. |
| Counterparty list | < 800 ms | First 500 records. |
| Invoice list | < 800 ms | First 500 records. |
| Financing offer generation | < 1500 ms | Includes pricing engine call. |
| Credit limit check | < 300 ms | Inside financing accept/fund path. |
| Funding allocation | < 1000 ms | Equal split baseline. |
| Report summary | < 1000 ms | Current reports/operations summary. |

No dedicated load-test tool is currently configured. Recommended next tool: `k6` with smoke scenarios for login, dashboard, invoice list, offer generation, funding, and operations dashboard.

Manual baseline command example:

```bash
time curl -sS http://localhost:3001/health
```
