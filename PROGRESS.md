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

## 2026-10-23: Etap 2 (katalog)
- Repozytorium `Patryha/PATRIX` podpięte; Etapy 0–1 na `main`. Pierwszy przebieg CI na `main` wykrył, że backend w zadaniu E2E nie startował (`medusa start` bez buildu); poprawione: build + start z `.medusa/server` w trybie produkcyjnym, twardy błąd gdy backend nie wstanie.
- Moduł `patrix-catalog`: marki, dane produktu (GPSR, 1169/2011, CLP, 1223/2009), ceny zakupu, historia cen.
- Blokada publikacji niekompletnych produktów w hookach workflow Medusy (obejmuje panel, API i import CSV).
- Omnibus: historia cen z cennikami promocyjnymi, najniższa cena z 30 dni przed obecną ceną; znaczek „Promocja” usunięty z kart listingu, dopóki karta nie pokazuje najniższej ceny z 30 dni.
- Panel: widżet danych produktu z listą braków, widżet cen zakupu (finanse), strona marek. Sprawdzone w przeglądarce.
- Sklep: pełna karta produktu, listing z filtrami i sortowaniem, strony marek, JSON-LD.
- Katalog testowy [TEST] do E2E.
- Testy: wszystkie zielone (`TEST_REPORT.md`).
- Następny krok: Etap 3 (koszyk, checkout, klienci, podatki, zwroty).
