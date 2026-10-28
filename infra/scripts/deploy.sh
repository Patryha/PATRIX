#!/usr/bin/env bash
# Wdrożenie PATRIX na serwerze w kolejności z DEPLOYMENT.md (D-039, D-040).
#   deploy.sh pierwsze      pierwsze uruchomienie: kontrola .env → backend → seed i klucz publikowalny → sklep → Caddy
#   deploy.sh aktualizacja  po `git pull`: kontrola .env → kopia zapasowa → backend i worker → sklep → przeładowanie Caddy
# Konto właściciela panelu zakłada się osobno (DEPLOYMENT.md), żeby hasło nie trafiło do historii powłoki.
# Dodatkowe opcje `docker build` (np. proxy na serwerze): BACKEND_BUILD_OPTS, STOREFRONT_BUILD_OPTS.
set -euo pipefail
cd "$(dirname "$0")/.."

mode="${1:-}"
case "$mode" in pierwsze | aktualizacja) ;; *) echo "Użycie: $0 pierwsze|aktualizacja" >&2; exit 2 ;; esac

env_val() { { grep -E "^$1=" .env || true; } | tail -1 | cut -d= -f2-; }

build_backend() {
  # shellcheck disable=SC2086 # opcje celowo dzielone na słowa
  docker build ${BACKEND_BUILD_OPTS:-} -t patrix-backend:latest ../apps/backend
}

# Sklep prerenderuje strony z danymi, więc buduje się z siecią hosta przy działającym backendzie (D-039).
build_storefront() {
  local key
  key="$(env_val NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)"
  [ -n "$key" ] || { echo "Brak NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY w infra/.env" >&2; exit 1; }
  # shellcheck disable=SC2086
  docker build ${STOREFRONT_BUILD_OPTS:-} --network host -t patrix-storefront:latest \
    --build-arg MEDUSA_BACKEND_URL="http://127.0.0.1:$(env_val BACKEND_HOST_PORT | grep . || echo 9000)" \
    --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$key" \
    --build-arg NEXT_PUBLIC_SITE_URL="$(env_val NEXT_PUBLIC_SITE_URL)" \
    --build-arg NEXT_PUBLIC_IMAGE_HOSTS="$(env_val NEXT_PUBLIC_IMAGE_HOSTS | grep . || echo localhost)" \
    --build-arg NEXT_PUBLIC_ALLOW_INDEXING="$(env_val NEXT_PUBLIC_ALLOW_INDEXING | grep . || echo false)" \
    --build-arg NEXT_PUBLIC_GA4_ID="$(env_val NEXT_PUBLIC_GA4_ID)" \
    --build-arg NEXT_PUBLIC_META_PIXEL_ID="$(env_val NEXT_PUBLIC_META_PIXEL_ID)" \
    ../apps/storefront
}

wait_healthy() {
  local id status=brak
  id="$(docker compose ps -q "$1")"
  for _ in $(seq 1 90); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$id" 2> /dev/null || echo brak)"
    [ "$status" = healthy ] && return 0
    sleep 2
  done
  echo "Usługa $1 nie jest gotowa (status: $status). Logi: docker compose logs $1" >&2
  exit 1
}

smoke() {
  local shop api
  shop="$(env_val SHOP_DOMAIN)"
  api="$(env_val API_DOMAIN)"
  for _ in $(seq 1 30); do
    curl -skf -o /dev/null --resolve "$shop:443:127.0.0.1" "https://$shop/" && break
    sleep 2
  done
  curl -skf -o /dev/null --resolve "$shop:443:127.0.0.1" "https://$shop/" || { echo "Sklep nie odpowiada przez Caddy" >&2; exit 1; }
  curl -skf -o /dev/null --resolve "$api:443:127.0.0.1" "https://$api/health" || { echo "API nie odpowiada przez Caddy" >&2; exit 1; }
  echo "Sklep https://$shop i API https://$api odpowiadają."
}

echo "== Kontrola konfiguracji"
scripts/preflight.sh

if [ "$mode" = pierwsze ]; then
  echo "== Obraz backendu"
  build_backend
  echo "== Baza, kolejki, pliki, backend i worker"
  docker compose up -d postgres redis minio backend worker
  wait_healthy backend

  if [ -z "$(env_val NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)" ]; then
    echo "== Konfiguracja startowa sklepu (seed)"
    key="$(docker compose exec -T backend npx medusa exec ./src/scripts/seed.js | grep -o 'pk_[a-f0-9]*' | tail -1)"
    [ -n "$key" ] || { echo "Seed nie zwrócił klucza publikowalnego" >&2; exit 1; }
    if grep -q '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' .env; then
      sed -i "s/^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$key/" .env
    else
      echo "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$key" >> .env
    fi
    echo "Klucz publikowalny zapisany w infra/.env"
  fi

  echo "== Obraz sklepu i start sklepu oraz Caddy"
  build_storefront
  docker compose up -d storefront caddy
  smoke
  echo
  echo "Dalej: konto właściciela panelu (DEPLOYMENT.md, „Pierwsze uruchomienie”), kopie w cronie (scripts/backup.sh)."
else
  echo "== Kopia zapasowa przed aktualizacją"
  scripts/backup.sh
  echo "== Backend i worker (migracje wykonuje backend)"
  build_backend
  docker compose up -d backend
  wait_healthy backend
  docker compose up -d worker
  echo "== Sklep (build z danymi z nowego backendu)"
  build_storefront
  docker compose up -d storefront
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
  smoke
fi
