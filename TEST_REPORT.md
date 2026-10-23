# Raport testów

Ostatnie uruchomienie: 2026-10-23 (Etap 2), lokalnie (PostgreSQL 16, Redis 7, Chromium 1243).

| Zestaw | Polecenie | Wynik |
|---|---|---|
| Backend: typy | `npm run typecheck` | OK |
| Backend: jednostkowe | `npm run test:unit` | 43/43 OK |
| Backend: integracyjne HTTP | `npm run test:integration:http` | 18/18 OK |
| Backend: build (API + panel) | `npx medusa build` | OK |
| Storefront: lint | `npm run lint` | OK |
| Storefront: typy | `npm run typecheck` | OK |
| Storefront: jednostkowe/komponenty | `npm test` | 20/20 OK |
| Storefront: build produkcyjny | `npm run build` | OK |
| Storefront: E2E (desktop + Pixel 7) | `npm run test:e2e` | 42/42 OK (backend w trybie produkcyjnym, katalog [TEST]) |
| Skan zależności | `npm audit --omit=dev` | storefront: 0; backend: 0 critical, podatności high w zależnościach Medusy (patrz SECURITY.md) |

## Co jest sprawdzane
- **Uprawnienia:** anonim → 401; konto bez roli → 403; właściciel → pełny dostęp; magazynier → magazyn tak, klienci/produkty (zapis)/audyt/klucze API nie; kierownik nie może nadawać ról; nie można odebrać ostatniego właściciela; token klienta → 401 na `/admin`.
- **MFA:** w trybie `required` konto bez MFA dostaje 403 poza konfiguracją MFA; po włączeniu TOTP samo hasło nie daje dostępu (401), błędny kod odrzucony, poprawny kod daje dostęp.
- **Audyt:** logowania udane i nieudane (bez hasła), operacje zmieniające z metodą, ścieżką i statusem, zmiany ról.
- **Kryptografia:** AES-256-GCM (losowe IV, wykrywanie manipulacji, zły klucz), porównanie w stałym czasie, kody zapasowe.
- **Design system:** kontrast WCAG AA wszystkich par tekst/tło w obu motywach; walidacja kolorów z panelu (ochrona przed wstrzyknięciem CSS); Omnibus (przekreślona cena tylko z najniższą ceną z 30 dni); cena jednostkowa.
- **E2E:** strona główna z 12 kategoriami z backendu i bez błędów konsoli, brak poziomego przewijania, axe WCAG 2.2 AA (jasny i ciemny), skip link, menu kategorii z klawiatury, nawigacja do kategorii, 404 z `noindex`, wyszukiwarka, trwałość motywu, `/admin` → panel, nagłówki bezpieczeństwa.

- **Katalog (Etap 2):** publikacja zablokowana bez kompletu danych (400), po uzupełnieniu dozwolona; walidacja UFI i odrzucenie nieznanych pól (np. próba ustawienia `data_status`); ceny zakupu: 403 dla roli marketing (odczyt i zapis); marka przypisana do produktu nie da się usunąć (409), duplikat uchwytu odrzucony; historia cen zapisywana przy utworzeniu produktu; Store API pokazuje tylko opublikowane produkty i tylko pola publiczne (bez notatek i danych weryfikatora). Jednostkowo: reguły kompletności dla żywności, chemii i kosmetyków, suma kontrolna EAN, okno Omnibus, filtry i sortowanie listingu, bezpieczna serializacja JSON-LD.
- **E2E (Etap 2):** karta produktu (zmiana wariantu zmienia cenę i SKU, informacja o najniższej cenie z 30 dni tylko przy obniżce, CLP, producent, JSON-LD, cena jednostkowa za kg, tabela wartości odżywczych, galeria z klawiatury, produkt niedostępny), listing (sortowanie po cenie, filtr dostępności i marki, usuwanie filtra, strona marki), axe WCAG 2.2 AA na karcie i listingu.

## Znane ograniczenia testów
- Docker Compose i obrazy nie zostały zbudowane (brak daemona Dockera w środowisku budowy).
- Skan DAST (HawkScan) nie uruchomiony: brak klucza API StackHawk; zaplanowany w Etapie 9.
- Strona 404 dla nieistniejącej kategorii/produktu zwraca HTTP 200 z `noindex` (ograniczenie strumieniowania w Next.js z Cache Components); do rozwiązania w Etapie 8 (SEO) przez `generateStaticParams`/weryfikację w proxy.
