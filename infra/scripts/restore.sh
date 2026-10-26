#!/usr/bin/env bash
# Odtworzenie kopii PATRIX z katalogu utworzonego przez backup.sh.
#   restore.sh <katalog>            test odtworzenia: baza do tymczasowej bazy, porównanie liczby wierszy, sprzątanie
#   restore.sh <katalog> --replace  odtworzenie produkcyjne: zatrzymuje sklep, nadpisuje bazę i pliki (wymaga potwierdzenia)
set -euo pipefail
cd "$(dirname "$0")/.."

dir="${1:?podaj katalog kopii, np. backups/20261026-020000}"
mode="${2:---check}"
HELPER_IMAGE="${BACKUP_HELPER_IMAGE:-postgres:16}"
PROJECT="${COMPOSE_PROJECT_NAME:-patrix}"
dir="$(cd "$dir" && pwd)"

echo "Sprawdzam sumy kontrolne"
(cd "$dir" && sha256sum -c SHA256SUMS)

psql() { docker compose exec -T postgres psql -U patrix -v ON_ERROR_STOP=1 "$@"; }
count_rows() {
  psql -d "$1" -At -c "SELECT string_agg(t || '=' || n, ' ' ORDER BY t) FROM (
    SELECT 'product' t, count(*) n FROM product UNION ALL SELECT 'order', count(*) FROM \"order\"
    UNION ALL SELECT 'customer', count(*) FROM customer UNION ALL SELECT 'stock_movement', count(*) FROM stock_movement
    UNION ALL SELECT 'cms_page_version', count(*) FROM cms_page_version) x"
}

if [ "$mode" = "--check" ]; then
  check_db=patrix_restore_check
  trap 'psql -d postgres -c "DROP DATABASE IF EXISTS $check_db" > /dev/null' EXIT
  psql -d postgres -c "DROP DATABASE IF EXISTS $check_db" -c "CREATE DATABASE $check_db" > /dev/null
  docker compose exec -T postgres pg_restore -U patrix -d "$check_db" --no-owner --exit-on-error < "$dir/db.dump"
  restored="$(count_rows "$check_db")"
  if [ -f "$dir/media.tar.gz" ]; then
    docker run --rm -v "$dir:/backup:ro" "$HELPER_IMAGE" tar tzf /backup/media.tar.gz > /dev/null
    echo "Archiwum plików czytelne"
  fi
  echo "Odtworzona kopia: $restored"
  echo "Baza bieżąca:     $(count_rows patrix)"
  echo "Test odtworzenia zakończony (baza produkcyjna bez zmian)."
  exit 0
fi

[ "$mode" = "--replace" ] || { echo "Nieznana opcja: $mode" >&2; exit 2; }
read -r -p "To NADPISZE bazę i pliki sklepu danymi z $dir. Wpisz TAK, aby kontynuować: " answer
[ "$answer" = "TAK" ] || { echo "Przerwano."; exit 1; }

docker compose stop caddy storefront worker backend
psql -d postgres -c "DROP DATABASE patrix WITH (FORCE)" -c "CREATE DATABASE patrix OWNER patrix" > /dev/null
docker compose exec -T postgres pg_restore -U patrix -d patrix --no-owner --exit-on-error < "$dir/db.dump"
if [ -f "$dir/media.tar.gz" ]; then
  docker compose stop minio
  docker run --rm -v "${PROJECT}_minio-data:/data" -v "$dir:/backup:ro" "$HELPER_IMAGE" \
    sh -c 'find /data -mindepth 1 -delete && tar xzf /backup/media.tar.gz -C /data'
  docker compose start minio
fi
docker compose up -d backend worker storefront caddy
echo "Odtworzono: $(count_rows patrix)"
