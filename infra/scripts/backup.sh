#!/usr/bin/env bash
# Kopia zapasowa PATRIX: baza PostgreSQL (format custom pg_dump) i pliki produktów (wolumen uploads).
# Uruchamiaj na serwerze (np. z crona co noc). Kopię poza serwerem robi właściciel wybranym narzędziem
# (patrz DEPLOYMENT.md, „Kopie zapasowe”).
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
HELPER_IMAGE="${BACKUP_HELPER_IMAGE:-postgres:16}"
PROJECT="${COMPOSE_PROJECT_NAME:-patrix}"

stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR/$stamp"
out="$(cd "$BACKUP_DIR/$stamp" && pwd)"

echo "Baza danych → $out/db.dump"
docker compose exec -T postgres pg_dump -U patrix -d patrix -Fc --no-owner > "$out/db.dump"

if docker volume inspect "${PROJECT}_uploads" > /dev/null 2>&1; then
  echo "Pliki produktów → $out/media.tar.gz"
  docker run --rm -v "${PROJECT}_uploads:/data:ro" -v "$out:/backup" "$HELPER_IMAGE" \
    tar czf /backup/media.tar.gz -C /data .
else
  echo "Brak wolumenu ${PROJECT}_uploads: pliki są w zewnętrznym magazynie S3 lub jeszcze ich nie ma (kopia po stronie dostawcy)."
fi

(cd "$out" && sha256sum ./* > SHA256SUMS)
echo "Gotowe: $out"

# Usuwamy tylko stare katalogi kopii w $BACKUP_DIR (nazwy RRRRMMDD-GGMMSS).
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20[0-9][0-9][01][0-9][0-3][0-9]-*' -mtime "+$KEEP_DAYS" -print -exec rm -r {} +
