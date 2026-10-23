# Architektura PATRIX

```
             ┌──────────────┐  HTTPS   ┌─────────────────────────┐
 Klient ───▶ │ Caddy (TLS,  │ ───────▶ │ Storefront Next.js 16   │──┐ Store API (klucz publikowalny)
             │ nagłówki)    │          │ apps/storefront         │  │
 Pracownik ▶ │              │ ───────▶ │ Medusa backend + panel  │◀─┘
             └──────────────┘          │ apps/backend (/app,     │
                                       │ /admin API, /store API) │
                                       └──┬───────┬──────┬───────┘
                                  PostgreSQL 16  Redis   S3 (MinIO/R2/S3)
                                  (dane)   (zdarzenia, workflow, blokady, sesje, rate limit)
```

## Warstwy i ich miejsce w kodzie

| Warstwa | Implementacja | Stan |
|---|---|---|
| Storefront | `apps/storefront` (Next.js 16, Tailwind 4, design system `src/design-system`) | Etap 1 |
| Commerce backend | Medusa v2 (`apps/backend`), moduły rdzenia | Etap 1 |
| Admin | Medusa Admin `/app` + rozszerzenia (`src/admin`), API `src/api/admin/patrix` | Etap 1 (API ról, audyt) |
| Bezpieczeństwo | moduł `patrix-security`: role, audyt; natywne MFA; rate limit | Etap 1 |
| Magazyn | moduły Inventory/Stock Location Medusy + moduł `patrix-inventory` (partie, FEFO) | Etap 5 |
| Płatności / Dostawy | providery Medusy budowane na adapterach Integration Center | Etap 6 |
| Integracje | moduł `patrix-integrations` (manifest, sejf, webhooki, kolejka, logi) | Etap 6 |
| Wyszukiwanie | Medusa `q` → Meilisearch | Etap 7 |
| CMS | moduł `patrix-cms` (sekcje strony głównej, wersje, podgląd) | Etap 4 |
| Analityka | GA4/Meta przez CMP (za zgodą) | Etap 8 |
| AI | warstwa propozycji z akceptacją człowieka | Etap 7 |

## Backend: ważne elementy
- `medusa-config.ts`: Redis (event bus, workflow engine, locking) gdy jest `REDIS_URL`; S3 gdy jest `S3_BUCKET`; sesja `patrix.sid` 8 h, cookies `httpOnly`, `secure` w produkcji; w produkcji wymagane sekrety (`JWT_SECRET`, `COOKIE_SECRET`, `AUTH_MFA_ENCRYPTION_KEY`, `PATRIX_ENCRYPTION_KEY`).
- `src/api/middlewares.ts`: kolejność dla `/admin/*`: wymuszanie MFA → autoryzacja ról → audyt operacji zmieniających.
- `src/lib/permissions.ts`: katalog uprawnień, mapa tras → zasób, role systemowe.
- `src/lib/crypto.ts`: AES-256-GCM dla sekretów integracji (Etap 6).
- `src/scripts/seed.ts`: idempotentna konfiguracja bazowa (bez produktów i cen).

## Storefront: ważne elementy
- Dane: `src/lib/data/*` (`"use cache"`, `cacheLife("minutes")`, `cacheTag`), komponenty danych w `<Suspense>` ze szkieletami.
- Motyw: `buildThemeCss()` generuje zmienne `--px-*` dla jasnego i ciemnego trybu; skrypt inicjujący ustawia zapisany motyw przed pierwszym malowaniem.
- Dostępność: link „Przejdź do treści”, widoczny fokus, menu kategorii jako disclosure (Escape, powrót fokusu), cele dotyku ≥ 44 px, `prefers-reduced-motion`.

## Rozszerzalność (rynki, języki, waluty)
Medusa obsługuje wiele regionów, walut, kanałów sprzedaży i tłumaczeń. Teksty storefrontu zostaną wydzielone do słowników przy dodawaniu drugiego języka (Etap 8/10); trasy są już niezależne od waluty.
