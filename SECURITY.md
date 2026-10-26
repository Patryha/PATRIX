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

## Integracje (Etap 6)
- Dane dostępowe operatorów tylko zaszyfrowane (AES-256-GCM, `PATRIX_ENCRYPTION_KEY`), nigdy w odpowiedziach API, logach ani audycie; panel widzi końcówkę sekretu.
- Webhooki: weryfikacja podpisu na surowej treści przed jakimkolwiek przetwarzaniem, limit 600 żądań/min z IP, limit treści 1 MB, idempotencja na unikalnym indeksie.
- Tryb produkcyjny integracji wyłącznie po jawnej zgodzie w konfiguracji serwera.
- Treść zdarzeń (np. powiadomień o płatności) przechowywana do ponowień; polityka retencji do ustalenia z właścicielem przy RODO (Etap 8/10).

## Wyszukiwarka (Etap 7)
- Publiczne `/store/patrix/search*`: limit 300 żądań/min z IP, fraza 1–100 znaków, tylko produkty opublikowane z kanałów sprzedaży klucza publicznego.
- Rekomendacje: limit 300 żądań/min z IP, identyfikatory walidowane (`prod_…`, maks. 50); para „kupowane razem” dopiero z 2 różnych zamówień (D-033).
- Statystyki fraz bez danych klienta (bez IP, identyfikatora, sesji); zmiana synonimów wymaga uprawnienia `product:write`.

## SEO (Etap 8)
- Przekierowania tylko na ścieżki sklepu (walidacja w backendzie i ponownie w proxy sklepu): brak otwartych przekierowań; adresów panelu nie można przekierować; uprawnienie `content`.
- Zgody: bez zgody nie ładujemy skryptów firm trzecich; identyfikatory narzędzi walidowane (format GA4/Meta). Przy ścisłym CSP (Etap 9) trzeba dopuścić `googletagmanager.com`, `google-analytics.com`, `connect.facebook.net`, `facebook.com`.
- Staging nie jest indeksowany (`robots.txt` i metatag robots), dopóki `NEXT_PUBLIC_ALLOW_INDEXING` nie jest `true`.

## Znane ryzyka
- `npm audit` backendu: podatności „high” w zależnościach tranzytywnych Medusy (`@graphql-tools/utils` — prototype pollution w `mergeDeep`; `vite` — dotyczy serwera deweloperskiego panelu). `lodash` podniesiony przez `overrides` do 4.18.1. Pozostałe czekają na aktualizację Medusy (Dependabot grupuje `@medusajs/*`). Produkcja nie uruchamia serwera deweloperskiego Vite.
- Ścisłe CSP `script-src` z nonce: Etap 9 (po wyborze dostawców płatności i analityki).

## Plan (kolejne etapy)
Kopie zapasowe i plan odtwarzania (Etap 10), separacja środowisk dev/staging/prod (Etap 10), DAST (Etap 9), testy uprawnień dla nowych modułów (każdy etap).
