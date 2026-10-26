# Bezpieczeństwo

## Zaimplementowane (Etap 1)
- Role i uprawnienia pracowników, deny-by-default dla `/admin` (D-004); klient nie ma dostępu do API administracyjnego.
- MFA (TOTP + kody zapasowe), wymuszane w produkcji przez `ADMIN_MFA_ENFORCEMENT=required`.
- Hasła: dostawca `emailpass` Medusy (scrypt). Sesje `httpOnly`, `secure` w produkcji, wygasanie 8 h; JWT 8 h.
- Rate limiting logowania/rejestracji (Redis).
- Dziennik audytu (bez haseł i treści żądań).
- Walidacja danych wejściowych (zod) w API PATRIX; zapytania przez ORM (parametryzowane).
- Nagłówki bezpieczeństwa w aplikacjach i na reverse proxy. CSP sklepu (`src/lib/csp.ts`, D-038): `default-src 'self'`, połączenia, obrazy, czcionki i ramki tylko z własnej domeny, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`, `upgrade-insecure-requests` na https; adresy GA4/Meta dochodzą tylko przy skonfigurowanym identyfikatorze.
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
- Zgody: bez zgody nie ładujemy skryptów firm trzecich; identyfikatory narzędzi walidowane (format GA4/Meta). CSP dopuszcza ich domeny automatycznie tylko przy ustawionym identyfikatorze (D-038).
- Staging nie jest indeksowany (`robots.txt` i metatag robots), dopóki `NEXT_PUBLIC_ALLOW_INDEXING` nie jest `true`.

## Testy bezpieczeństwa (Etap 9)
- OWASP ZAP lokalnie (2026-10-26): skan podstawowy i aktywny sklepu, skan podstawowy API. 0 błędów; reguły aktywne m.in. XSS (odbite i trwałe), SQL injection, path traversal, przekierowania zewnętrzne, SSI. Raporty: `/mnt/project-files/patrix/zap/`.
- API backendu wysyła `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` (odpowiedzi to wyłącznie JSON). Panel `/app` nie przechodzi przez middleware API; na produkcji nagłówki dodaje Caddy.
- Ostrzeżenia przyjęte: 10055 (`'unsafe-inline'` w `script-src`, patrz niżej i D-038); 10202 (brak tokenów anty-CSRF w formularzach): formularze to akcje serwera Next.js, które porównują nagłówek `Origin` z `Host` i odrzucają żądania z innych domen, a ciasteczka sesji mają `httpOnly`, `sameSite: lax` i `secure` na produkcji. Informacyjne 10031 (parametry `sort`/`marka` odbite w atrybutach: wartości z białej listy, React escapuje).
- Inwentarz uprawnień: test jednostkowy wymusza jawne przypisanie zasobu każdej nowej trasie `/admin/patrix`.

## Znane ryzyka
- `npm audit` backendu: podatności „high” w zależnościach tranzytywnych Medusy (`@graphql-tools/utils` — prototype pollution w `mergeDeep`; `vite` — dotyczy serwera deweloperskiego panelu). `lodash` podniesiony przez `overrides` do 4.18.1. Pozostałe czekają na aktualizację Medusy (Dependabot grupuje `@medusajs/*`). Produkcja nie uruchamia serwera deweloperskiego Vite.
- `script-src` zawiera `'unsafe-inline'`: nonce wyłączyłby częściowe prerenderowanie (każda strona renderowana na żądanie), a skryptów z danymi strony nie da się zahashować (D-038). Ryzyko XSS ograniczają: React (escapowanie), brak HTML z bazy (blog i CMS jako dane), JSON-LD z escapowaniem `<`, walidacja linków. Do ponownej oceny, gdy Next.js udostępni hashe dla skryptów strumieniowanych. Przy integracji płatności z przekierowaniem formularza trzeba będzie dopisać domenę operatora do `form-action`.

## Plan (kolejne etapy)
Kopie zapasowe i plan odtwarzania (Etap 10), separacja środowisk dev/staging/prod (Etap 10), powtórzenie DAST na stagingu (Etap 10), testy uprawnień dla nowych modułów (każdy etap).
