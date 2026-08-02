#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -f docker-compose.yml ] && [ ! -f compose.yml ]; then
  echo "ERROR: No docker-compose file found in $ROOT_DIR." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: Missing .env. Copy .env.production.example to .env and set production values." >&2
  exit 1
fi

REQUIRED_ENV="
POSTGRES_PASSWORD
JWT_SECRET
PAYMENT_WEBHOOK_SECRET
ERP_WEBHOOK_SECRET
EINVOICING_WEBHOOK_SECRET
WEBHOOK_SIGNING_SECRET
APP_URL
NEXT_PUBLIC_API_URL
CORS_ORIGINS
"

missing=""
for key in $REQUIRED_ENV; do
  if ! grep -Eq "^[[:space:]]*${key}=" .env; then
    missing="${missing} ${key}"
  fi
done

if [ -n "$missing" ]; then
  echo "ERROR: .env is missing required production variables:" >&2
  for key in $missing; do
    echo "  - $key" >&2
  done
  echo "Copy .env.production.example to .env and set real values before deploying." >&2
  exit 1
fi

storage_provider="$(grep -E '^[[:space:]]*STORAGE_PROVIDER=' .env | tail -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'")"
if [ "$storage_provider" = "s3" ]; then
  s3_missing=""
  for key in S3_ENDPOINT S3_REGION S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY; do
    if ! grep -Eq "^[[:space:]]*${key}=.+" .env; then
      s3_missing="${s3_missing} ${key}"
    fi
  done
  if [ -n "$s3_missing" ]; then
    echo "ERROR: STORAGE_PROVIDER=s3 but .env is missing S3 values:" >&2
    for key in $s3_missing; do
      echo "  - $key" >&2
    done
    echo "Set STORAGE_PROVIDER=local for now, or add valid DigitalOcean Spaces credentials." >&2
    exit 1
  fi
fi

COMPOSE_FILE="docker-compose.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="compose.yml"
fi

docker compose -f "$COMPOSE_FILE" pull --ignore-buildable
docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker compose -f "$COMPOSE_FILE" ps
