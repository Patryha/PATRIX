# Zadania

Statusy: TODO · IN PROGRESS · BLOCKED · TESTING · DONE

## Etap 0: Audyt środowiska
| ID | Zadanie | Status | Wynik / weryfikacja |
|---|---|---|---|
| E0-1 | Audyt narzędzi i repozytoriów | DONE | Node 22, npm, PostgreSQL 16, Redis; brak daemona Dockera; brak repo PATRIX na GitHubie |
| E0-2 | Ocena silników commerce i wybór architektury | DONE | Medusa 2.22 + Next.js 16 (DECISIONS D-001, D-002) |
| E0-3 | Plan i dokumenty projektu | DONE | MASTER_PLAN.md i pozostałe dokumenty |
| E0-4 | Repozytorium GitHub | BLOCKED | Czeka na utworzenie pustego repo przez właściciela (np. `Patryha/patrix-shop`); kod w lokalnym git + kopia `patrix.bundle` w plikach projektu |

## Etap 1: Fundament techniczny
| ID | Zadanie | Status | Wynik / weryfikacja |
|---|---|---|---|
| E1-1 | Struktura monorepo, TypeScript | DONE | `apps/backend`, `apps/storefront`; `tsc --noEmit` czysto w obu |
| E1-2 | Baza danych i migracje | DONE | PostgreSQL 16; migracje Medusy + `patrix-security` |
| E1-3 | Konfiguracja produkcyjna backendu | DONE | Redis (event bus, workflow, locking), S3, sesje, wymagane sekrety w prod |
| E1-4 | Role i uprawnienia pracowników (deny-by-default) | DONE | 12 testów integracyjnych (właściciel, brak roli, magazynier, klient, anonim) |
| E1-5 | MFA administratorów | DONE | Natywne MFA Medusy + polityka `ADMIN_MFA_ENFORCEMENT`; test E2E API logowania z TOTP |
| E1-6 | Dziennik audytu | DONE | Logowania (sukces/porażka), operacje zmieniające, zmiany ról; bez haseł i treści żądań |
| E1-7 | Rate limiting | DONE | `/auth/*`, `/store/customers*`; Redis (prod) / pamięć (dev) |
| E1-8 | Seed bazowy PL | DONE | Idempotentny; 12 kategorii, PLN brutto, VAT 23%, region, kanały (web + stacjonarny), magazyn, klucz publikowalny, role |
| E1-9 | Design system PATRIX | DONE | Tokeny, motyw jasny/ciemny, komponenty (Button, Field, Badge, Price z Omnibus i ceną jednostkową, Skeleton, ProductCard) |
| E1-10 | Szkielet storefrontu | DONE | Nagłówek sticky, menu kategorii, wyszukiwarka, strona główna, kategoria, produkt (podstawowy), 404, błąd, `/admin` → panel |
| E1-11 | Testy i CI | DONE | Backend 31 unit + 12 integracyjnych; storefront 14 unit + 24 E2E (axe WCAG 2.2 AA); GitHub Actions + Dependabot |
| E1-12 | Docker Compose, Caddy | TESTING | Pliki gotowe; nie uruchomione (brak daemona Dockera w środowisku) — do weryfikacji na stagingu |

## Etap 2: Frontend sklepu (następny)
| ID | Zadanie | Status |
|---|---|---|
| E2-1 | Moduł danych produktu PATRIX (nazwa oryginalna, EAN/GTIN, marka/producent, pojemność/masa, skład, alergeny, ostrzeżenia CLP, dane kosmetyku, kraj pochodzenia, GPSR) + kontrola kompletności | TODO |
| E2-2 | Listing: filtry (marka, cena, atrybuty kategorii), sortowanie, paginacja, produkty niedostępne | TODO |
| E2-3 | Pełna karta produktu: galeria, warianty, cena jednostkowa, Omnibus, dane prawne, powiązane | TODO |
| E2-4 | Strona główna z sekcjami (dane z CMS w Etapie 4; do tego czasu z konfiguracji) | TODO |
| E2-5 | Mega menu z grafikami, ostatnio oglądane (lokalnie, bez śledzenia) | TODO |
| E2-6 | Historia cen (Omnibus) w backendzie | TODO |

## Zadania wymagające właściciela
| ID | Czego potrzeba | Status |
|---|---|---|
| OWN-1 | Puste repozytorium GitHub (np. `Patryha/patrix-shop`) | BLOCKED |
| OWN-2 | Dane firmy (nazwa, adres, NIP, REGON, kontakt) do regulaminu, stopki, faktur | BLOCKED (potrzebne od Etapu 3/8) |
| OWN-3 | Ceny, progi darmowej dostawy, cennik wysyłek | BLOCKED (Etap 3) |
| OWN-4 | Konta i klucze sandbox operatorów płatności i przewoźników | BLOCKED (Etap 6) |
| OWN-5 | Domena i hosting/staging | BLOCKED (Etap 10) |
