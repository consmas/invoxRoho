# Release Readiness Checklist

- [ ] Database migrations are applied in staging.
- [ ] `npm run seed:auth` completed.
- [ ] `npm run seed:demo` completed if demo environment.
- [ ] API lint/build/tests pass.
- [ ] Web lint/build pass.
- [ ] Go engine tests pass.
- [ ] Health endpoints pass.
- [ ] Pricing engine is reachable from API.
- [ ] Admin login works.
- [ ] Full financing lifecycle smoke test passes.
- [ ] `npm run test:release1-flow` passes with API and pricing engine running.
- [ ] Documents upload/verify/reject flow passes.
- [ ] Integration credentials are not exposed.
- [ ] Webhook delivery records are created.
- [ ] Audit logs exist for sensitive actions.
- [ ] Security checklist reviewed.
- [ ] Manual UAT scripts executed and signed off.
