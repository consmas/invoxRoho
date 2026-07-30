# Staging Deployment

## Required Services

- PostgreSQL 16
- Redis 7
- NestJS API
- Next.js web app
- Pricing engine
- Credit engine baseline service
- Funding engine baseline service

## Environment

Set all variables from `apps/api/.env.example`. In staging, do not use development secrets. Required:

```bash
DATABASE_URL
JWT_SECRET
APP_PORT
PRICING_ENGINE_URL
CREDIT_ENGINE_URL
FUNDING_ENGINE_URL
REDIS_HOST
REDIS_PORT
```

## Migration And Seed

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
npm run seed:auth
npm run seed:demo
```

## Start Commands

```bash
cd apps/api && npm run build && npm run start:prod
cd apps/web && npm run build && npm run start
cd services/pricing-engine && go run main.go
cd services/credit-engine && go test ./...
cd services/funding-engine && go test ./...
```

## Docker Compose Option

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

## Health Checks

- API: `http://<api-host>:3001/health`
- Pricing engine: `http://<pricing-host>:4001/health`
- Web: `http://<web-host>:3000`

## Rollback Notes

Keep the previous API/web image tags available. For database rollback, restore from a pre-migration backup; do not hand-edit applied Prisma migrations.

## Backup Notes

Take a PostgreSQL backup before every migration. Store local document storage or S3 bucket data with the same recovery point objective.

## Known Production Gaps

- No MFA/SSO.
- No real payment/KYC/notification providers.
- No automated load testing.
- No HA deployment topology in repo.
- File upload size/type policy needs tightening.
