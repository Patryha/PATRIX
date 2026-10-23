# Bezpieczeństwo

## Zaimplementowane (Etap 1)
- Role i uprawnienia pracowników, deny-by-default dla `/admin` (D-004); klient nie ma dostępu do API administracyjnego.
- MFA (TOTP + kody zapasowe), wymuszane w produkcji przez `ADMIN_MFA_ENFORCEMENT=required`.
- Hasła: dostawca `emailpass` Medusy (scrypt). Sesje `httpOnly`, `secure` w produkcji, wygasanie 8 h; JWT 8 h.
- Rate limiting logowania/rejestracji (Redis).
- Dziennik audytu (bez haseł i treści żądań).
- Walidacja danych wejściowych (zod) w API PATRIX; zapytania przez ORM (parametryzowane).
- Nagłówki bezpieczeństwa w aplikacjach i na reverse proxy; CSP bazowe (frame-ancestors, object-src, base-uri, form-action).
- Błędy bez stosu wywołań (domyślny handler Medusy, `error.tsx` w sklepie).
- Sekrety tylko w zmiennych środowiskowych; w produkcji brak wartości domyślnych (start się nie powiedzie bez sekretów).
- Skan zależności w CI + Dependabot.

## Znane ryzyka
- `npm audit` backendu: podatności „high” w zależnościach tranzytywnych Medusy (`@graphql-tools/utils` — prototype pollution w `mergeDeep`; `vite` — dotyczy serwera deweloperskiego panelu). `lodash` podniesiony przez `overrides` do 4.18.1. Pozostałe czekają na aktualizację Medusy (Dependabot grupuje `@medusajs/*`). Produkcja nie uruchamia serwera deweloperskiego Vite.
- Ścisłe CSP `script-src` z nonce: Etap 9 (po wyborze dostawców płatności i analityki).

## Plan (kolejne etapy)
Kopie zapasowe i plan odtwarzania (Etap 10), separacja środowisk dev/staging/prod (Etap 10), DAST (Etap 9), testy uprawnień dla nowych modułów (każdy etap).
