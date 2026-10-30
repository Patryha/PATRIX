# Stan integracji

Żadna integracja zewnętrzna nie jest jeszcze podłączona. Nie deklarujemy działania integracji bez zweryfikowanego połączenia.

| Obszar | Integracja | Stan | Uwagi |
|---|---|---|---|
| Płatności | Ręczna/systemowa Medusy (`pp_system_default`) | Dostępna tylko do testów | Nie pobiera pieniędzy |
| Płatności | Przelewy24, PayU, Tpay, Stripe, BLIK, Apple/Google Pay, pobranie | TODO (Etap 6) | Wymagają kont sandbox właściciela; potwierdzenie płatności wyłącznie z podpisanego webhooka |
| Dostawy | Wysyłka ręczna Medusy (`manual_manual`) | Skonfigurowana strefa „Polska”, bez opcji i cen | Cennik od właściciela |
| Dostawy | InPost, DPD, DHL, GLS, ORLEN Paczka, Poczta Polska | TODO (Etap 6) | |
| Magazyn/księgowość | Base(linker), Subiekt, Comarch, Fakturownia, inFakt, ERP/WMS/POS | TODO (Etap 6) | Bez zakładania konkretnego POS przed potwierdzeniem kompatybilności |
| Marketplace | Google Merchant Center | Feed gotowy: `/feed/google.xml` (D-036) | Podpięcie w koncie właściciela (OWN-10), działa po włączeniu indeksowania |
| Marketplace | Allegro, Meta Commerce | TODO | Konta właściciela |
| Pliki | Dysk serwera (wolumen `uploads`) lub S3-compatible (R2/S3) | Dysk domyślnie (`PATRIX_FILE_URL`), S3 gdy jest `S3_BUCKET` | W dev pliki lokalne |

## Centrum integracji (Etap 6, fundament)
- Panel → „Integracje”: lista z manifestu (`src/integrations/manifest.ts`). Integracja bez adaptera ma status „w przygotowaniu” i nie da się jej włączyć ani zapisać do niej danych.
- Dane dostępowe: szyfrowane AES-256-GCM w `integration_connection.credentials`; panel i API pokazują tylko podpowiedzi (końcówka sekretu). Zmiany w dzienniku audytu bez wartości.
- Tryb: domyślnie testowy (sandbox). Produkcyjny wymaga `PATRIX_ALLOW_PRODUCTION_INTEGRATIONS=true` w konfiguracji serwera (decyzja właściciela).
- Webhooki: `POST /hooks/patrix/<adapter>`; podpis sprawdza adapter na surowej treści; każde zdarzenie zapisywane raz (adapter + identyfikator zewnętrzny); błąd obsługi → ponowienia po 1, 2, 4… min (maks. 8 prób, potem „wymaga reakcji” i ręczne „Ponów teraz”).
- Dziennik wywołań bez sekretów (`integration_log`).
- Nowy adapter: obiekt `IntegrationAdapter` (`src/integrations/types.ts`) z polami danych dostępowych, testem połączenia (prawdziwe wywołanie API operatora), weryfikacją podpisu i idempotentną obsługą zdarzeń; rejestracja `registerAdapter`.

## Fundament gotowy w Etapie 1
- `src/lib/crypto.ts`: szyfrowanie sekretów integracji AES-256-GCM (`PATRIX_ENCRYPTION_KEY`).
- Uprawnienie `integration:*` w rolach; klucze API Medusy (`sk_…`) tylko dla `integration:write`.
