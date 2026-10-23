# Raport testów

Ostatnie uruchomienie: 2026-10-23, lokalnie (PostgreSQL 16, Redis 7, Chromium 1243).

| Zestaw | Polecenie | Wynik |
|---|---|---|
| Backend: typy | `npm run typecheck` | OK |
| Backend: jednostkowe | `npm run test:unit` | 31/31 OK |
| Backend: integracyjne HTTP | `npm run test:integration:http` | 12/12 OK |
| Storefront: lint | `npm run lint` | OK |
| Storefront: typy | `npm run typecheck` | OK |
| Storefront: jednostkowe/komponenty | `npm test` | 14/14 OK |
| Storefront: build produkcyjny | `npm run build` | OK |
| Storefront: E2E (desktop + Pixel 7) | `npm run test:e2e` | 24/24 OK |
| Skan zależności | `npm audit --omit=dev` | storefront: 0; backend: 0 critical, podatności high w zależnościach Medusy (patrz SECURITY.md) |

## Co jest sprawdzane
- **Uprawnienia:** anonim → 401; konto bez roli → 403; właściciel → pełny dostęp; magazynier → magazyn tak, klienci/produkty (zapis)/audyt/klucze API nie; kierownik nie może nadawać ról; nie można odebrać ostatniego właściciela; token klienta → 401 na `/admin`.
- **MFA:** w trybie `required` konto bez MFA dostaje 403 poza konfiguracją MFA; po włączeniu TOTP samo hasło nie daje dostępu (401), błędny kod odrzucony, poprawny kod daje dostęp.
- **Audyt:** logowania udane i nieudane (bez hasła), operacje zmieniające z metodą, ścieżką i statusem, zmiany ról.
- **Kryptografia:** AES-256-GCM (losowe IV, wykrywanie manipulacji, zły klucz), porównanie w stałym czasie, kody zapasowe.
- **Design system:** kontrast WCAG AA wszystkich par tekst/tło w obu motywach; walidacja kolorów z panelu (ochrona przed wstrzyknięciem CSS); Omnibus (przekreślona cena tylko z najniższą ceną z 30 dni); cena jednostkowa.
- **E2E:** strona główna z 12 kategoriami z backendu i bez błędów konsoli, brak poziomego przewijania, axe WCAG 2.2 AA (jasny i ciemny), skip link, menu kategorii z klawiatury, nawigacja do kategorii, 404 z `noindex`, wyszukiwarka, trwałość motywu, `/admin` → panel, nagłówki bezpieczeństwa.

## Znane ograniczenia testów
- Docker Compose i obrazy nie zostały zbudowane (brak daemona Dockera w środowisku budowy).
- Skan DAST (HawkScan) nie uruchomiony: brak klucza API StackHawk; zaplanowany w Etapie 9.
- Strona 404 dla nieistniejącej kategorii/produktu zwraca HTTP 200 z `noindex` (ograniczenie strumieniowania w Next.js z Cache Components); do rozwiązania w Etapie 8 (SEO) przez `generateStaticParams`/weryfikację w proxy.
