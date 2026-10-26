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
Wymagania serwera: Linux z Dockerem i Docker Compose v2, min. 4 GB RAM (build sklepu i backendu), domeny sklepu i API wskazujące na serwer (rekordy A/AAAA), otwarte porty 80 i 443.

Pierwsze uruchomienie (kolejność ma znaczenie: sklep budowany jest z danymi z działającego backendu, a klucz publikowalny powstaje dopiero po seedzie):
```bash
cd infra
cp .env.example .env            # domeny i sekrety: openssl rand -base64 48 (JWT, cookie), openssl rand -base64 32 (klucze szyfrowania)
docker compose up -d --build postgres redis minio backend worker
docker compose exec backend npx medusa exec ./src/scripts/seed.js          # wypisuje klucz publikowalny pk_…
# wpisz klucz do infra/.env jako NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
docker compose exec backend npx medusa user -e wlasciciel@firma.pl -p '<silne hasło>'
docker compose exec backend npx medusa exec ./src/scripts/grant-role.js wlasciciel@firma.pl owner
docker compose up -d --build storefront caddy
```
Aktualizacja: `git pull`, potem `docker compose up -d --build backend worker`, a po starcie backendu `docker compose up -d --build storefront`.

- `backend` (API i panel) wykonuje migracje przy starcie; `worker` (zadania w tle) startuje dopiero, gdy backend jest gotowy, i migracji nie uruchamia (Medusa nie blokuje migracji wykonywanych równolegle).
- Backend jest dostępny na `127.0.0.1:9000` serwera (dla buildu sklepu); z zewnątrz ruch idzie wyłącznie przez Caddy.
- Baza łączy się bez TLS (`sslmode=disable`), bo działa w wewnętrznej sieci Dockera. Przy bazie zarządzanej poza serwerem usuń ten parametr: Medusa włączy SSL.
- Zmienne `NEXT_PUBLIC_*` i `NEXT_PUBLIC_IMAGE_HOSTS` są wkompilowane w obraz sklepu: po ich zmianie przebuduj `storefront`.
- Obraz sklepu działa w trybie `standalone` Next.js (sam serwer i potrzebne pliki, ok. 430 MB).
- Caddy wystawia TLS (Let's Encrypt), przekierowuje HTTP na HTTPS i dodaje nagłówki bezpieczeństwa (HSTS, nosniff, X-Frame-Options).
- Pliki produktów: S3-compatible (MinIO w compose; w produkcji można użyć zarządzanego S3/R2 z CDN, co jest usługą płatną i wymaga decyzji właściciela).
- Stan: obrazy zbudowane i uruchomione lokalnie 2026-10-26 (pełny stos przez Caddy z HTTPS, E2E 86/86 na kontenerze sklepu). Na prawdziwym serwerze jeszcze nieuruchomione (brak serwera i domeny, OWN-5).

## Kopie zapasowe
```bash
infra/scripts/backup.sh                               # baza (pg_dump) + pliki (wolumen MinIO) + sumy SHA256 w infra/backups/RRRRMMDD-GGMMSS
infra/scripts/restore.sh infra/backups/<katalog>      # test odtworzenia do tymczasowej bazy, produkcja bez zmian
infra/scripts/restore.sh infra/backups/<katalog> --replace   # przywrócenie (zatrzymuje sklep, wymaga wpisania TAK)
```
- Harmonogram: cron co noc, np. `0 3 * * * cd /srv/patrix/infra && scripts/backup.sh >> backups/backup.log 2>&1`. Kopie starsze niż `BACKUP_KEEP_DAYS` (domyślnie 14) są usuwane.
- Kopia na tym samym serwerze nie chroni przed awarią serwera: katalog `infra/backups` trzeba kopiować poza serwer (np. rclone do magazynu w innej lokalizacji). Wybór usługi należy do właściciela (koszt).
- Test odtworzenia (`restore.sh <katalog>`) raz w miesiącu i przed każdą większą aktualizacją.
- Redis nie wymaga kopii (kolejki i pamięć podręczna; dane trwałe są w PostgreSQL).
- Sprawdzone lokalnie 2026-10-26: kopia, test odtworzenia i pełne przywrócenie bazy oraz plików.

## Zmienne środowiskowe
Pełna lista z opisami: `apps/backend/.env.example`, `apps/storefront/.env.example`, `infra/.env.example`.

## Checklista przed startem sprzedaży
Każdy punkt oznaczony **[W]** wymaga decyzji lub danych właściciela.

**Prawo i dane firmy**
- [ ] **[W]** Dane firmy (nazwa, adres, NIP, REGON, kontakt) wpisane w stopce i dokumentach
- [ ] **[W]** Regulamin, polityka prywatności i polityka cookies przygotowane i zweryfikowane prawnie (dziś strony sklepu informują tylko, że dokumenty powstają; OWN-6)
- [ ] **[W]** Zasady zwrotów i reklamacji, formularz odstąpienia od umowy (OWN-8)
- [ ] Dane produktów (skład, alergeny, ostrzeżenia, producent/GPSR) kompletne i zweryfikowane z etykietą (panel blokuje publikację niekompletnych)

**Sprzedaż**
- [ ] **[W]** Ceny, VAT i koszty dostawy ustalone przez właściciela
- [ ] **[W]** Płatności: konto operatora, test w sandboxie, potem jedna transakcja testowa w produkcji za zgodą właściciela (OWN-4)
- [ ] **[W]** Dostawy: konta przewoźników, test etykiet w sandboxie
- [ ] **[W]** Wysyłka e-maili do klientów (dostawca, domena nadawcy SPF/DKIM) i treści wiadomości
- [ ] Usunięty katalog testowy (`[TEST]`) i konta testowe

**Bezpieczeństwo i działanie**
- [ ] Silne, unikalne sekrety w `infra/.env`; plik tylko na serwerze, nie w repozytorium
- [ ] `ADMIN_MFA_ENFORCEMENT=required`, wszyscy pracownicy z MFA i właściwymi rolami
- [ ] Integracje w trybie testowym, dopóki właściciel nie zatwierdzi produkcji (`PATRIX_ALLOW_PRODUCTION_INTEGRATIONS`)
- [ ] Kopia nocna w cronie, kopia poza serwerem, wykonany test odtworzenia
- [ ] Staging: E2E, Lighthouse (Core Web Vitals) i skan ZAP powtórzone na adresie z HTTPS
- [ ] Monitoring dostępności (`/health` backendu i strona główna) z powiadomieniem

**Publikacja (tylko za zgodą właściciela)**
- [ ] **[W]** Identyfikatory GA4/Meta (opcjonalnie, OWN-9), konto Merchant Center (OWN-10)
- [ ] `NEXT_PUBLIC_ALLOW_INDEXING=true` i przebudowa sklepu dopiero w dniu publikacji
- [ ] **[W]** Zgoda właściciela na uruchomienie publicznej sprzedaży
