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

## Etap 2: Katalog i frontend sklepu
| ID | Zadanie | Status | Rozwiązanie / weryfikacja |
|---|---|---|---|
| E2-1 | Moduł danych produktu PATRIX + kontrola kompletności | DONE | Moduł `patrix-catalog` (marki, dane produktu, ceny zakupu, historia cen). Hooki `productsCreated`/`productsUpdated` blokują publikację niekompletnego produktu z każdej ścieżki (panel, API, import). Testy integracyjne |
| E2-2 | Listing: filtry, sortowanie, paginacja, produkty niedostępne | DONE | Filtry marki i dostępności, sortowanie (nowości, cena, nazwa), strony, działa bez JS (formularz GET). Do 500 produktów na listę; większy katalog: Meilisearch (E7). Filtry atrybutów kategorii: po CMS kategorii (E4) |
| E2-3 | Pełna karta produktu | DONE | Galeria, warianty z ceną/SKU/EAN, cena jednostkowa, Omnibus, skład, alergeny, wartości odżywcze, CLP, producent (GPSR), JSON-LD Product + BreadcrumbList. Produkty powiązane: E7 (rekomendacje) |
| E2-4 | Strona główna z sekcjami (dane z CMS w Etapie 4) | TODO | Przeniesione do Etapu 4 razem z CMS (sekcje edytowalne z panelu) |
| E2-5 | Mega menu z grafikami, ostatnio oglądane (lokalnie, bez śledzenia) | TODO | Grafiki kategorii zależą od CMS (E4) |
| E2-6 | Historia cen (Omnibus) w backendzie | DONE | Zapis przy utworzeniu/edycji produktu + zadanie co 15 min (łapie cenniki promocyjne); najniższa cena z 30 dni przed wprowadzeniem obecnej ceny |
| E2-7 | Panel: formularz danych produktu, ceny zakupu, marki | DONE | Widżety na karcie produktu, strona „Marki”; ceny zakupu tylko z uprawnieniem `finance` (test 403) |
| E2-8 | Katalog testowy dla E2E | DONE | `npm run seed:test-catalog`, produkty z prefiksem [TEST], EAN z puli 200, blokada na produkcji |

## Etap 3: Koszyk, checkout, klienci
| ID | Zadanie | Status | Rozwiązanie / weryfikacja |
|---|---|---|---|
| E3-1 | Koszyk | DONE | Dodawanie (też z paska na telefonie), zmiana ilości, usuwanie, licznik w nagłówku; koszyk w ciasteczku httpOnly; działa bez JS (akcje serwera) |
| E3-2 | Kody rabatowe | DONE | Naliczanie i usuwanie kodów (wielkość liter bez znaczenia), komunikaty po polsku; testowy kod TEST10 w katalogu [TEST] |
| E3-3 | Checkout: dane, adres, dostawa, płatność, podsumowanie | DONE | Walidacja (telefon, kod pocztowy PL), formy dostawy z backendu, płatność przy odbiorze (`pp_system_default`); zakup jako gość |
| E3-4 | Faktura na firmę | DONE | Nazwa firmy + NIP z kontrolą sumy; NIP w adresie rozliczeniowym zamówienia i w metadanych |
| E3-5 | Potwierdzenie zamówienia | DONE | Widoczne tylko w przeglądarce, która złożyła zamówienie (ciasteczko, 1 h), bez identyfikatora w adresie |
| E3-6 | Konto klienta | DONE | Rejestracja (silne hasło, regulamin), logowanie, przeniesienie koszyka gościa na konto, historia zamówień, wylogowanie czyści koszyk; token tylko w ciasteczku httpOnly |
| E3-7 | Reset hasła, e-maile transakcyjne | TODO | Wymaga dostawcy e-mail i zgody właściciela na wysyłkę (Etap 6) |
| E3-8 | Paczkomaty/punkty odbioru, progi darmowej dostawy | BLOCKED | Integracje przewoźników (Etap 6) i stawki od właściciela (OWN-3); w testach „[TEST] Kurier testowy” |
| E3-9 | Zwroty | TODO | Etap 5 (zamówienia i magazyn w panelu) |
| E3-10 | Regulamin i polityka prywatności | BLOCKED | Strony istnieją z informacją „w przygotowaniu”; treść od właściciela/prawnika (OWN-6) |

## Zadania wymagające właściciela
| ID | Czego potrzeba | Status |
|---|---|---|
| OWN-1 | Repozytorium GitHub | DONE (`Patryha/PATRIX`) |
| OWN-2 | Dane firmy (nazwa, adres, NIP, REGON, kontakt) do regulaminu, stopki, faktur | BLOCKED (potrzebne od Etapu 3/8) |
| OWN-3 | Ceny, progi darmowej dostawy, cennik wysyłek | BLOCKED (Etap 3) |
| OWN-4 | Konta i klucze sandbox operatorów płatności i przewoźników | BLOCKED (Etap 6) |
| OWN-5 | Domena i hosting/staging | BLOCKED (Etap 10) |
| OWN-6 | Treść regulaminu i polityki prywatności (zatwierdzona prawnie) | BLOCKED (przed startem sprzedaży) |
