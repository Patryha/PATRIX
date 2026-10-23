# Dziennik realizacji

## 2026-10-23: Etap 0 i Etap 1
- Audyt: brak istniejącego repozytorium PATRIX; dostępne Node 22, PostgreSQL 16, Redis; brak daemona Dockera.
- Wybór: Medusa 2.22.1 + Next.js 16.4. Weryfikacja dokumentacji na zainstalowanych pakietach (dokumentacja Next.js w `node_modules/next/dist/docs`, typy i kod Medusy).
- Odkrycie: RBAC i SSO w Medusie 2.22 to Enterprise Edition (płatna licencja). Usunięto użycie flag i `definePolicies`, zbudowano własne role PATRIX (D-004).
- Odkrycie: Medusa ma natywne MFA (TOTP) obsługiwane w panelu; porzucono własną implementację MFA na rzecz natywnej (D-005).
- Backend: moduł `patrix-security`, autoryzacja `/admin`, audyt, rate limit, nagłówki, seed PL, skrypt `grant-role`.
- Storefront: design system, motyw jasny/ciemny, nagłówek, menu kategorii, strona główna, kategoria, produkt, wyszukiwarka, 404, `/admin`.
- Testy: wszystkie zielone (szczegóły w `TEST_REPORT.md`). Poprawka znaleziona przez testy: kontrast przycisku w ciemnym hero (axe), sekcja hero dostała własne tokeny.
- Infrastruktura: CI, Dependabot, Docker Compose, Caddy, Dockerfile.
- Następny krok: Etap 2 (moduł danych produktu PATRIX i pełny katalog).
