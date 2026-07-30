# Release 1 Security Checklist

| Area | Status | Notes |
|---|---:|---|
| JWT secret safety | Partial | Production startup rejects known unsafe defaults. Use secret manager in staging/prod. |
| Password hashing | Implemented | Bcrypt is used for local users. |
| RBAC enforcement | Implemented | Global permission/role guards are configured. |
| Permission denial tests | Partial | Unit coverage exists; broader API tests recommended. |
| Maker-checker controls | Implemented | Self-approval is rejected. |
| Audit immutability | Partial | Audit logs exist; DB-level append-only controls are not enforced. |
| No passwordHash in responses | Implemented | User serialization excludes password hashes. |
| No credentials in integration APIs | Implemented | Connection responses are sanitized and logs mask secrets. |
| CORS settings | Partial | Local origin configured; staging/prod origin list required. |
| Rate limiting | Not Started | Add Nest throttler or gateway-level rate limits. |
| MFA/SSO | Deferred | Required before enterprise production rollout. |
| Secrets management | Partial | Env vars supported; managed secret store needed. |
| File upload restrictions | Partial | Multipart upload exists; file type/size policy should be tightened. |
| SQL injection protection | Implemented | Prisma query APIs are used. |
| XSS/CSRF notes | Partial | React escapes by default; API is bearer-token based. Review rich text inputs. |
| TLS | Not Started | TLS must terminate at staging/prod ingress. |
| Backup/recovery | Partial | Documented; automated backup jobs needed. |
