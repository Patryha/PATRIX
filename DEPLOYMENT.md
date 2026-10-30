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

Najprościej na czystym VPS (Ubuntu lub Debian, jako root), gdy rekordy A domeny, `www` i `api` wskazują już na serwer:
```bash
curl -fsSL https://raw.githubusercontent.com/Patryha/PATRIX/main/infra/scripts/bootstrap-vps.sh | bash -s -- patrix.com.pl
```
Skrypt `infra/scripts/bootstrap-vps.sh` sprawdza DNS, w razie potrzeby dodaje plik wymiany (przy < 4 GB RAM), instaluje Dockera (oficjalny skrypt get.docker.com) i git, pobiera kod do `/opt/patrix`, tworzy `infra/.env` z losowymi sekretami i zamyka sklep hasłem na czas stagingu (login `patrix`, hasło w `/opt/patrix/infra/.staging-password`), potem uruchamia `deploy.sh pierwsze`. Przed scaleniem do `main` dodaj `PATRIX_BRANCH=<gałąź>` przed `bash`. Ponowne uruchomienie nie zmienia `.env` ani hasła. Zdjęcie hasła przy starcie sprzedaży (tylko za zgodą właściciela): usuń `infra/caddy/shop-auth.caddy` i `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`.

Pierwsze uruchomienie ręcznie:
```bash
cd infra
cp .env.example .env && chmod 600 .env   # domeny i sekrety: openssl rand -base64 48 (JWT, cookie), openssl rand -base64 32 (klucze szyfrowania)
scripts/preflight.sh                     # kontrola .env: puste i słabe sekrety, domeny z wzoru, spójność adresów, MFA
scripts/deploy.sh pierwsze               # obrazy, baza, backend, seed (klucz publikowalny trafia do .env), sklep, Caddy, test HTTPS
# konto właściciela bez hasła w historii powłoki: zaproszenie, hasło ustawiasz w przeglądarce
docker compose exec backend npx medusa user -e wlasciciel@firma.pl --invite   # wypisuje token
#   otwórz https://<API_DOMAIN>/app/invite?token=<token>, ustaw hasło, potem nadaj rolę:
docker compose exec backend npx medusa exec ./src/scripts/grant-role.js wlasciciel@firma.pl owner
#   po pierwszym logowaniu panel wymaga włączenia MFA (Profil → MFA), dopiero potem pokazuje dane
```
Aktualizacja: `git pull`, potem `scripts/deploy.sh aktualizacja` (kopia zapasowa, nowy backend i worker, po ich starcie nowy sklep, przeładowanie Caddy, test HTTPS).

Kolejność ma znaczenie: sklep budowany jest z danymi z działającego backendu, a klucz publikowalny powstaje dopiero po seedzie. Obrazy buduje `deploy.sh` poleceniem `docker build` (build sklepu potrzebuje sieci hosta, a nowy Docker Compose wymaga na to interaktywnej zgody); `docker-compose.yml` tylko uruchamia gotowe obrazy `patrix-backend` (backend i worker) i `patrix-storefront`. Opcje dodatkowe dla `docker build` (np. proxy): zmienne `BACKEND_BUILD_OPTS` i `STOREFRONT_BUILD_OPTS`.

- `backend` (API i panel) wykonuje migracje przy starcie; `worker` (zadania w tle) startuje dopiero, gdy backend jest gotowy, i migracji nie uruchamia (Medusa nie blokuje migracji wykonywanych równolegle).
- Backend jest dostępny na `127.0.0.1:9000` serwera (dla buildu sklepu); z zewnątrz ruch idzie wyłącznie przez Caddy.
- Baza łączy się bez TLS (`sslmode=disable`), bo działa w wewnętrznej sieci Dockera. Przy bazie zarządzanej poza serwerem usuń ten parametr: Medusa włączy SSL.
- Zmienne `NEXT_PUBLIC_*` i `NEXT_PUBLIC_IMAGE_HOSTS` są wkompilowane w obraz sklepu: po ich zmianie uruchom `scripts/deploy.sh aktualizacja`.
- Obraz sklepu działa w trybie `standalone` Next.js (sam serwer i potrzebne pliki, ok. 430 MB).
- Caddy wystawia TLS (Let's Encrypt), przekierowuje HTTP na HTTPS i dodaje nagłówki bezpieczeństwa (HSTS, nosniff, X-Frame-Options).
- Pliki produktów: na dysku serwera w wolumenie `uploads`, serwowane przez backend pod `https://<API_DOMAIN>/static` (D-042). Zewnętrzny S3/R2 z CDN (usługa płatna, decyzja właściciela): zmienne `S3_*` w `.env`.
- Stan: obrazy zbudowane i uruchomione lokalnie 2026-10-26 (pełny stos przez Caddy z HTTPS, E2E 86/86 na kontenerze sklepu). Na prawdziwym serwerze jeszcze nieuruchomione (brak serwera i domeny, OWN-5).

## Kopie zapasowe
```bash
infra/scripts/backup.sh                               # baza (pg_dump) + pliki (wolumen uploads) + sumy SHA256 w infra/backups/RRRRMMDD-GGMMSS
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
- [ ] Brak danych testowych: `docker compose exec backend npx medusa exec ./src/scripts/remove-test-catalog.js` pokazuje, co zostało z katalogu `[TEST]` (np. gdy baza ze stagingu przechodzi na produkcję); z argumentem `usun` usuwa. Konta testowe usunięte w panelu

**Bezpieczeństwo i działanie**
- [ ] `scripts/preflight.sh` bez błędów: silne, unikalne sekrety w `infra/.env` (plik tylko na serwerze, `chmod 600`), właściwe domeny
- [ ] `ADMIN_MFA_ENFORCEMENT=required`, wszyscy pracownicy z MFA i właściwymi rolami
- [ ] Integracje w trybie testowym, dopóki właściciel nie zatwierdzi produkcji (`PATRIX_ALLOW_PRODUCTION_INTEGRATIONS`)
- [ ] Kopia nocna w cronie, kopia poza serwerem, wykonany test odtworzenia
- [ ] Staging: E2E, Lighthouse (Core Web Vitals) i skan ZAP powtórzone na adresie z HTTPS
- [ ] Monitoring dostępności (`/health` backendu i strona główna) z powiadomieniem

**Publikacja (tylko za zgodą właściciela)**
- [ ] **[W]** Identyfikatory GA4/Meta (opcjonalnie, OWN-9), konto Merchant Center (OWN-10)
- [ ] `NEXT_PUBLIC_ALLOW_INDEXING=true` i przebudowa sklepu dopiero w dniu publikacji
- [ ] **[W]** Zgoda właściciela na uruchomienie publicznej sprzedaży
