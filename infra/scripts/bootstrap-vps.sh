#!/usr/bin/env bash
# Pierwsze uruchomienie PATRIX na czystym VPS (Ubuntu lub Debian, jako root) jednym poleceniem:
#   curl -fsSL https://raw.githubusercontent.com/Patryha/PATRIX/main/infra/scripts/bootstrap-vps.sh | bash -s -- patrix.com.pl
# Sprawdza DNS, instaluje Dockera i git, pobiera kod do /opt/patrix, tworzy infra/.env z losowymi sekretami,
# zamyka sklep hasłem (staging) i uruchamia scripts/deploy.sh pierwsze (DEPLOYMENT.md).
# Ponowne uruchomienie nie zmienia istniejącego .env ani hasła stagingu.
# Zmienne: PATRIX_BRANCH (gałąź, domyślnie main), PATRIX_DIR (/opt/patrix), PATRIX_OPEN_SHOP=1 (sklep bez hasła),
# PATRIX_SKIP_DNS_CHECK=1 (pominięcie kontroli DNS).
set -euo pipefail

SHOP="${1:?Podaj domenę sklepu, np. patrix.com.pl}"
API="${2:-api.$SHOP}"
BRANCH="${PATRIX_BRANCH:-main}"
REPO="${PATRIX_REPO:-https://github.com/Patryha/PATRIX.git}"
DIR="${PATRIX_DIR:-/opt/patrix}"

say() { printf '\n== %s\n' "$*"; }
die() { printf '\nBŁĄD: %s\n' "$*" >&2; exit 1; }
rand() { local s; s="$(openssl rand -base64 96 | tr -dc 'A-Za-z0-9')"; printf '%s' "${s:0:$1}"; }

[ "$(id -u)" = 0 ] || die "uruchom jako root (sudo -i)"
command -v apt-get > /dev/null || die "skrypt obsługuje Ubuntu i Debiana (apt-get)"

say "Pakiety systemowe"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git openssl > /dev/null

say "Kontrola DNS"
ip="$(curl -fsS -m 10 https://api.ipify.org || true)"
if [ "${PATRIX_SKIP_DNS_CHECK:-}" != 1 ]; then
  [ -n "$ip" ] || die "nie ustaliłem publicznego IP serwera (PATRIX_SKIP_DNS_CHECK=1 pomija kontrolę)"
  missing=""
  for host in "$SHOP" "$API"; do
    getent ahostsv4 "$host" | awk '{print $1}' | grep -qx "$ip" || missing="$missing $host"
  done
  [ -z "$missing" ] || die "domeny nie wskazują na ten serwer ($ip):$missing
Dodaj w DNS rekordy A: $SHOP, www.$SHOP i $API → $ip, odczekaj kilka minut i uruchom ponownie.
Bez tego certyfikaty HTTPS (Let's Encrypt) nie zostaną wydane."
  echo "$SHOP i $API → $ip"
fi

say "Pamięć"
mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
swap_mb="$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)"
echo "RAM: ${mem_mb} MB, swap: ${swap_mb} MB"
# Build backendu i sklepu potrzebuje ok. 4 GB; przy mniejszej pamięci dokładamy plik wymiany.
if [ "$mem_mb" -lt 3800 ] && [ "$swap_mb" -lt 2000 ] && [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile > /dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Dodano plik wymiany 4 GB"
fi

say "Docker"
if ! command -v docker > /dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version

say "Kod PATRIX ($BRANCH) w $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch --quiet origin "$BRANCH"
  git -C "$DIR" checkout --quiet "$BRANCH"
  git -C "$DIR" pull --quiet --ff-only origin "$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO" "$DIR"
fi
git -C "$DIR" log --oneline -1
cd "$DIR/infra"

if [ -f .env ]; then
  say "infra/.env już istnieje: zostawiam bez zmian"
else
  say "Sekrety w infra/.env"
  umask 077
  cat > .env << EOF
SHOP_DOMAIN=$SHOP
API_DOMAIN=$API
POSTGRES_PASSWORD=$(rand 32)
JWT_SECRET=$(rand 48)
COOKIE_SECRET=$(rand 48)
AUTH_MFA_ENCRYPTION_KEY=$(rand 48)
PATRIX_ENCRYPTION_KEY=$(openssl rand -base64 32)
ADMIN_MFA_ENFORCEMENT=required
STORE_CORS=https://$SHOP
ADMIN_CORS=https://$API
AUTH_CORS=https://$API,https://$SHOP
MEDUSA_BACKEND_URL=https://$API
NEXT_PUBLIC_SITE_URL=https://$SHOP
PATRIX_ADMIN_URL=https://$API/app
NEXT_PUBLIC_IMAGE_HOSTS=$API
NEXT_PUBLIC_ALLOW_INDEXING=false
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
EOF
  chmod 600 .env
  umask 022
  echo "Utworzono (uprawnienia 600)"
fi

if [ "${PATRIX_OPEN_SHOP:-}" != 1 ] && [ ! -f caddy/shop-auth.caddy ]; then
  say "Hasło na sklep (staging)"
  pass="$(rand 20)"
  hash="$(docker run --rm caddy:2 caddy hash-password --plaintext "$pass")"
  printf 'basic_auth {\n\tpatrix %s\n}\n' "$hash" > caddy/shop-auth.caddy
  printf 'login: patrix\nhasło: %s\n' "$pass" > .staging-password
  chmod 600 .staging-password
  echo "Zapisano w $DIR/infra/.staging-password"
fi

if command -v ufw > /dev/null && ufw status | grep -q "Status: active"; then
  say "Zapora: otwieram porty 80 i 443"
  ufw allow 80/tcp > /dev/null && ufw allow 443/tcp > /dev/null
fi

say "Wdrożenie"
scripts/deploy.sh pierwsze

say "Gotowe"
echo "Sklep:  https://$SHOP"
if [ -f .staging-password ]; then sed 's/^/        /' .staging-password; fi
echo "Panel:  https://$API/app (konto właściciela: DEPLOYMENT.md, „Pierwsze uruchomienie”)"
echo "Pliki:  $DIR (sekrety w infra/.env, nie udostępniaj)"
