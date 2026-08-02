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

COMPOSE_FILE="docker-compose.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="compose.yml"
fi

docker compose -f "$COMPOSE_FILE" pull --ignore-buildable
docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker compose -f "$COMPOSE_FILE" ps
