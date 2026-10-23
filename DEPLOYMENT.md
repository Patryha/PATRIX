# Wdrożenie i uruchomienie

> Publikacja produkcyjna wymaga wyraźnej zgody właściciela. Ten dokument opisuje przygotowanie środowisk.

## Środowisko deweloperskie
Wymagania: Node 22, PostgreSQL 16, Redis 7.

```bash
# Backend
cd apps/backend
cp .env.example .env            # uzupełnij sekrety deweloperskie
createdb patrix_dev
npx medusa db:migrate
npm run seed                    # konfiguracja PL; wypisuje klucz publikowalny pk_…
npx medusa user -e ty@firma.pl -p 'silne-haslo'
npm run grant-role -- ty@firma.pl owner
npm run dev                     # API :9000, panel http://localhost:9000/app

# Storefront
cd apps/storefront
cp .env.example .env.local      # wpisz NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY z seeda
npm run dev                     # http://localhost:8000
```

Pierwsze logowanie do panelu: Profil → MFA → włącz aplikację uwierzytelniającą (w produkcji obowiązkowe).

## Staging / produkcja (Docker Compose)
```bash
cd infra
cp .env.example .env            # domeny, sekrety (openssl rand -base64 48 / 32)
docker compose up -d --build
docker compose exec backend npx medusa exec ./src/scripts/seed.js   # jednorazowo
```
- `backend` (API + panel) i `worker` (zadania w tle) to osobne procesy (`MEDUSA_WORKER_MODE`).
- Caddy wystawia TLS (Let's Encrypt) i nagłówki bezpieczeństwa.
- Pliki produktów: S3-compatible (MinIO w compose, w produkcji zalecany zarządzany magazyn S3/R2 z CDN).
- Stan: pliki przygotowane, nieprzetestowane w kontenerach (brak Dockera w środowisku budowy) — weryfikacja na stagingu w Etapie 10.

## Zmienne środowiskowe
Pełna lista z opisami: `apps/backend/.env.example`, `apps/storefront/.env.example`, `infra/.env.example`.

## Checklista przed startem sprzedaży (rozwijana w Etapie 10)
- [ ] Dane firmy, regulamin, polityka prywatności i cookies zweryfikowane prawnie
- [ ] `ADMIN_MFA_ENFORCEMENT=required`, wszyscy pracownicy z MFA i właściwymi rolami
- [ ] Płatności i dostawy zweryfikowane w sandboxie, potem w produkcji kwotą testową (za zgodą właściciela)
- [ ] Kopie zapasowe bazy i plików + test odtworzenia
- [ ] `NEXT_PUBLIC_ALLOW_INDEXING=true` dopiero przy publikacji
