#!/usr/bin/env bash
# Kontrola infra/.env przed wdrożeniem: brakujące lub słabe sekrety, domeny z wzoru, spójność adresów,
# ustawienia bezpieczeństwa. Niczego nie zmienia. Kod wyjścia 1, gdy jest choć jeden błąd.
set -uo pipefail
cd "$(dirname "$0")/.."
ENV_FILE="${1:-.env}"

errors=0
warnings=0
err() { echo "BŁĄD:  $*"; errors=$((errors + 1)); }
warn() { echo "UWAGA: $*"; warnings=$((warnings + 1)); }

[ -f "$ENV_FILE" ] || { echo "BŁĄD:  brak pliku $ENV_FILE (skopiuj .env.example)"; exit 1; }

val() {
  local v
  v="$(grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-)"
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  printf '%s' "$v"
}

for name in SHOP_DOMAIN API_DOMAIN POSTGRES_PASSWORD JWT_SECRET COOKIE_SECRET AUTH_MFA_ENCRYPTION_KEY PATRIX_ENCRYPTION_KEY \
  STORE_CORS ADMIN_CORS AUTH_CORS MEDUSA_BACKEND_URL S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY NEXT_PUBLIC_SITE_URL PATRIX_ADMIN_URL; do
  [ -n "$(val "$name")" ] || err "$name jest puste"
done

shop="$(val SHOP_DOMAIN)"
api="$(val API_DOMAIN)"
for name in SHOP_DOMAIN API_DOMAIN STORE_CORS ADMIN_CORS AUTH_CORS MEDUSA_BACKEND_URL NEXT_PUBLIC_SITE_URL PATRIX_ADMIN_URL S3_FILE_URL; do
  case "$(val "$name")" in
    *example.pl*) err "$name zawiera adres z wzoru: $(val "$name")" ;;
    # PATRIX_LOCAL_TEST=1 tylko do próby wdrożenia na własnym komputerze (domeny *.localhost z certyfikatem Caddy).
    *localhost*) if [ "${PATRIX_LOCAL_TEST:-}" = "1" ]; then warn "$name wskazuje localhost (próba lokalna)"; else err "$name wskazuje localhost: $(val "$name")"; fi ;;
  esac
done

min_len() { [ "${#2}" -ge "$3" ] || err "$1 ma ${#2} znaków, wymagane co najmniej $3"; }
min_len JWT_SECRET "$(val JWT_SECRET)" 32
min_len COOKIE_SECRET "$(val COOKIE_SECRET)" 32
min_len AUTH_MFA_ENCRYPTION_KEY "$(val AUTH_MFA_ENCRYPTION_KEY)" 32
min_len POSTGRES_PASSWORD "$(val POSTGRES_PASSWORD)" 20
min_len S3_SECRET_ACCESS_KEY "$(val S3_SECRET_ACCESS_KEY)" 20
[ "$(val JWT_SECRET)" != "$(val COOKIE_SECRET)" ] || err "JWT_SECRET i COOKIE_SECRET muszą być różne"
[ "$(printf '%s' "$(val PATRIX_ENCRYPTION_KEY)" | base64 -d 2> /dev/null | wc -c)" -eq 32 ] ||
  err "PATRIX_ENCRYPTION_KEY musi mieć 32 bajty w base64 (openssl rand -base64 32)"
[ "$(val PATRIX_ENCRYPTION_KEY)" != "$(val AUTH_MFA_ENCRYPTION_KEY)" ] || err "PATRIX_ENCRYPTION_KEY i AUTH_MFA_ENCRYPTION_KEY muszą być różne"

[ "$(val ADMIN_MFA_ENFORCEMENT)" = "required" ] || err "ADMIN_MFA_ENFORCEMENT musi być \"required\" (MFA obowiązkowe dla pracowników)"
[ "$(val NEXT_PUBLIC_SITE_URL)" = "https://$shop" ] || err "NEXT_PUBLIC_SITE_URL powinien być https://$shop"
[ "$(val MEDUSA_BACKEND_URL)" = "https://$api" ] || err "MEDUSA_BACKEND_URL powinien być https://$api"
[ "$(val PATRIX_ADMIN_URL)" = "https://$api/app" ] || err "PATRIX_ADMIN_URL powinien być https://$api/app"
[ "$(val STORE_CORS)" = "https://$shop" ] || err "STORE_CORS powinien być https://$shop"
[ "$(val ADMIN_CORS)" = "https://$api" ] || err "ADMIN_CORS powinien być https://$api"
case ",$(val AUTH_CORS)," in
  *",https://$api,"*) case ",$(val AUTH_CORS)," in *",https://$shop,"*) ;; *) err "AUTH_CORS powinien zawierać https://$shop" ;; esac ;;
  *) err "AUTH_CORS powinien zawierać https://$api" ;;
esac

[ -n "$(val NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)" ] || warn "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY puste: uzupełnij po seedzie, przed buildem sklepu"
[ "$(val NEXT_PUBLIC_ALLOW_INDEXING)" != "true" ] || warn "NEXT_PUBLIC_ALLOW_INDEXING=true: sklep będzie indeksowany (tylko po zgodzie właściciela na publikację)"
[ "$(val PATRIX_ALLOW_PRODUCTION_INTEGRATIONS)" != "true" ] || warn "PATRIX_ALLOW_PRODUCTION_INTEGRATIONS=true: integracje produkcyjne (tylko po zgodzie właściciela)"
[ "$(val PATRIX_ALLOW_TEST_CATALOG)" != "true" ] || err "PATRIX_ALLOW_TEST_CATALOG=true: katalog testowy nie może być włączony na produkcji"

perms="$(stat -c %a "$ENV_FILE" 2> /dev/null || echo 600)"
case "$perms" in 600 | 400) ;; *) warn "$ENV_FILE ma uprawnienia $perms; ustaw chmod 600 (sekrety)" ;; esac

echo "Kontrola $ENV_FILE: błędy $errors, uwagi $warnings"
[ "$errors" -eq 0 ]
