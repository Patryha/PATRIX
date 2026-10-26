# Zadania

Statusy: TODO · IN PROGRESS · BLOCKED · TESTING · DONE

## Etap 0: Audyt środowiska
| ID | Zadanie | Status | Wynik / weryfikacja |
|---|---|---|---|
| E0-1 | Audyt narzędzi i repozytoriów | DONE | Node 22, npm, PostgreSQL 16, Redis; brak daemona Dockera; brak repo PATRIX na GitHubie |
| E0-2 | Ocena silników commerce i wybór architektury | DONE | Medusa 2.22 + Next.js 16 (DECISIONS D-001, D-002) |
| E0-3 | Plan i dokumenty projektu | DONE | MASTER_PLAN.md i pozostałe dokumenty |
| E0-4 | Repozytorium GitHub | DONE | `Patryha/PATRIX`; każdy etap na osobnej gałęzi z PR, kopia `patrix.bundle` w plikach projektu |

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
| E2-4 | Strona główna z sekcjami (dane z CMS w Etapie 4) | DONE | Zrealizowane w E4-1..E4-4 |
| E2-5 | Mega menu z grafikami, ostatnio oglądane (lokalnie, bez śledzenia) | DONE | Ostatnio oglądane (E4-4), mega menu z grafikami (E4-8) |
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
| E3-9 | Zwroty | IN PROGRESS | Magazyn gotowy: przyjęty zwrot (natywny w panelu Medusy) wraca do partii, z których była sprzedaż, uszkodzone sztuki nie wracają (D-029). Formularz dla klienta czeka na decyzję właściciela (sposób odesłania, zasady z regulaminu OWN-6) |
| E3-10 | Regulamin i polityka prywatności | BLOCKED | Strony istnieją z informacją „w przygotowaniu”; treść od właściciela/prawnika (OWN-6) |

## Etap 4: Panel treści (CMS) i administracja
| ID | Zadanie | Status | Rozwiązanie / weryfikacja |
|---|---|---|---|
| E4-1 | Moduł CMS: wersje strony, szkic, publikacja, historia, przywracanie | DONE | Moduł `patrix-cms`, walidacja sekcji (zod) w backendzie, bezpieczne linki (tylko `/…` lub `https://`); test integracyjny pełnego cyklu, 403 dla roli bez `content` |
| E4-2 | Panel „Strona główna”: kolejność sekcji (przeciągnij i upuść + przyciski), edycja, widoczność | DONE | Edytor wszystkich typów sekcji, czytelne błędy walidacji; sprawdzone w przeglądarce kontem z rolą marketing |
| E4-3 | Podgląd szkicu przed publikacją | DONE | Jednorazowy token (w bazie tylko skrót SHA-256), ważny 60 min, unieważniany przy publikacji; `/podglad` z `noindex` |
| E4-4 | Sekcje sklepu: pasek informacyjny, slider, kategorie, nowości, bestsellery, promocje tygodnia, polecane, ostatnio oglądane, o marce, dostawy i płatności | DONE | Slider z pauzą (WCAG 2.2.2) i bez autoodtwarzania przy `prefers-reduced-motion`; bestsellery z zamówień z 30 dni; ostatnio oglądane tylko w przeglądarce klienta; E2E + axe |
| E4-5 | Newsletter (zapis z podwójnym potwierdzeniem) | TODO | Wymaga dostawcy e-mail i zgody właściciela na wysyłkę (Etap 6); sekcja nie jest pokazywana, dopóki nie działa |
| E4-6 | Ulubione | DONE | Przycisk na karcie produktu (formularz, działa bez JS), strona `/ulubione`, licznik w nagłówku; gość: ciasteczko httpOnly, klient: metadane konta (przeniesienie po zalogowaniu); E2E + axe |
| E4-7 | Zestawy (bundles) | DONE | Natywne „inventory kits” Medusy (sprzedaż zestawu zdejmuje ze stanu składniki); sekcja „W zestawie” na karcie produktu z linkami do składników; źródło sekcji CMS „Zestawy”; zestaw testowy [TEST]; E2E |
| E4-8 | Mega menu z grafikami, rozbudowana stopka z CMS | DONE | Panel „Menu i stopka” (strona CMS `layout`): grafiki kategorii z opisem alt, kolumny linków, kontakt tylko od właściciela; podgląd i wersje jak strona główna |
| E4-9 | Dashboard KPI, import produktów CSV/XLSX, zmiany masowe, zarządzanie rolami w panelu | DONE | „Pulpit sprzedaży” (KPI, kwoty tylko z finance:read), „Pracownicy i role” (role własne), „Import i zmiany masowe” (CSV: dane produktów i ceny zakupu; publikacja, marka, kategoria). XLSX: zapis jako CSV z Excela (D-026) |

## Etap 5: Magazyn
| ID | Zadanie | Status | Rozwiązanie / weryfikacja |
|---|---|---|---|
| E5-1 | Partie z numerem i datą ważności, dziennik ruchów | DONE | Moduł `patrix-warehouse` (partie, ruchy, inwentaryzacje); stan nadal w natywnym module Inventory Medusy (D-027) |
| E5-2 | Przyjęcia, wydania, korekty | DONE | Workflow `patrix-record-stock-movement`: zmiana stanu i wpis w dzienniku razem albo wcale (cofnięcie przy błędzie); wydanie nie może zejść poniżej rezerwacji; korekta wymaga powodu; test integracyjny z wymuszonym błędem |
| E5-3 | Sprzedaż według FEFO | DONE | Subskrybent wysyłki zdejmuje towar z partii z najkrótszą datą ważności (idempotentnie), anulowanie wysyłki przywraca partie; test integracyjny |
| E5-4 | Inwentaryzacja | DONE | Arkusz dla lokalizacji, zapis ilości, zatwierdzenie księguje różnice względem stanu w chwili zatwierdzenia, nieprzeliczone pozycje bez zmian; anulowanie |
| E5-5 | Raport dat ważności | DONE | Partie z terminem w ciągu 7/30/90 dni i po terminie |
| E5-6 | Panel „Magazyn” | DONE | Zakładki: stany z partiami, ruchy (formularz i dziennik), daty ważności, inwentaryzacja; sprawdzony w przeglądarce kontem magazyniera |
| E5-7 | Wiele magazynów i lokalizacji | DONE | Natywne lokalizacje Medusy; stany, ruchy i inwentaryzacje osobno dla każdej lokalizacji |
| E5-8 | Przesunięcia między magazynami (MM) | DONE | Workflow `patrix-transfer-stock`: rozchód w źródle, przyjęcie w celu, partie przechodzą z numerem i datą ważności; wszystko albo nic; test integracyjny; w panelu jako rodzaj ruchu |
| E5-9 | Raporty: wartość magazynu (z uprawnieniem do finansów), eksport ruchów do CSV | DONE | Wartość w cenach zakupu netto, pozycje bez ceny wykazane osobno (D-028), 403 dla magazyniera; eksport CSV dla Excela z filtrem okresu i ochroną przed formułami; zakładka „Wartość” i przycisk „Pobierz CSV” |
| E5-10 | Gotowość pod POS | DONE (API) | `GET /admin/patrix/warehouse/lookup?code=` (EAN, kod kreskowy, SKU → towar i stan w lokalizacjach), czytnik kodów w formularzu „Magazyn”; sprzedaż w sklepie stacjonarnym jako osobny kanał sprzedaży i lokalizacja Medusy. Kasa fiskalna i terminal płatniczy: decyzja i sprzęt właściciela (D-030) |

## Etap 6: Centrum integracji
| ID | Zadanie | Status | Rozwiązanie / weryfikacja |
|---|---|---|---|
| E6-1 | Fundament: manifest, sejf danych dostępowych, webhooki z podpisem, idempotencja, ponowienia, dziennik | DONE | Moduł `patrix-integrations`, `src/integrations` (manifest, rejestr adapterów), `src/lib/integrations.ts`; `/hooks/patrix/:adapter`; zadanie ponowień co minutę; panel „Integracje”; tryb produkcyjny tylko za zgodą w konfiguracji serwera (D-031); testy z adapterem testowym HMAC |
| E6-2 | Płatności: Przelewy24, PayU, Tpay, Stripe (providery Medusy na adapterach) | BLOCKED | Konta sandbox i klucze od właściciela (OWN-4) |
| E6-3 | Przewoźnicy: InPost, DPD, DHL, GLS, ORLEN Paczka, Poczta Polska | BLOCKED | Konta testowe od właściciela (OWN-4), cennik (OWN-3) |
| E6-4 | Księgowość i faktury (Fakturownia, inFakt), Base, Allegro | BLOCKED | Wybór systemu i konta właściciela |
| E6-5 | Dostawca e-mail (transakcyjne, reset hasła, newsletter) | BLOCKED | Wybór dostawcy i zgoda na wysyłkę (E3-7, E4-5) |

## Etap 7: Inteligentne funkcje
| ID | Zadanie | Status | Rozwiązanie / weryfikacja |
|---|---|---|---|
| E7-1 | Wyszukiwarka: literówki, PL/DE, synonimy, EAN/SKU, podpowiedzi, trafność | DONE | `src/lib/search.ts` (silnik), `src/lib/search-index.ts` (indeks z katalogu), moduł `patrix-search` (synonimy, statystyki fraz); `/store/patrix/search`, `/store/patrix/search/suggest`; panel „Wyszukiwarka” (synonimy, frazy bez wyników, test); sklep: sortowanie „Trafność”, „Czy chodziło Ci o…”, podpowiedzi w nagłówku (combobox z klawiaturą); D-032; testy jednostkowe, integracyjne i E2E |
| E7-2 | Rekomendacje produktów | DONE | `src/lib/recommendations.ts` (kupowane razem, podobne), `src/lib/recommendations-data.ts`, `GET /store/patrix/recommendations`; sekcje „Często kupowane razem” i „Podobne produkty” na karcie produktu oraz „Klienci kupowali też” w koszyku (D-033); testy jednostkowe, integracyjne i E2E |
| E7-3 | Wsparcie AI dla pracowników (propozycje opisów, tłumaczeń z etykiet) z akceptacją człowieka | TODO | Wymaga wyboru dostawcy modelu i zgody właściciela na płatną usługę |
| E7-4 | Chatbot na zweryfikowanej wiedzy | TODO | Jak E7-3 |

## Etap 8: Marketing i SEO
| ID | Zadanie | Status | Rozwiązanie / weryfikacja |
|---|---|---|---|
| E8-1 | Mapa strony i robots.txt | DONE | `app/sitemap.ts`, `app/robots.ts`, `lib/data/sitemap.ts`; indeksowanie tylko z `NEXT_PUBLIC_ALLOW_INDEXING=true` (D-034); E2E |
| E8-2 | Przekierowania 301/302 | DONE | Moduł `patrix-seo`, `src/lib/redirects.ts` (walidacja: tylko ścieżki sklepu, bez łańcuchów i pętli), `/admin/patrix/redirects`, `/store/patrix/redirects`, panel „Przekierowania”, `src/proxy.ts` w sklepie; testy jednostkowe, integracyjne, E2E, panel sprawdzony w przeglądarce |
| E8-3 | Metadane i dane strukturalne | DONE (Etap 2) | Kanoniczne adresy, Open Graph, JSON-LD produktu i ścieżki nawigacji |
| E8-4 | Zgody na cookies (CMP), GA4/Meta za zgodą | TODO | |
| E8-5 | Feed Google Merchant Center | TODO | Konto Merchant Center właściciela potrzebne dopiero do podpięcia feedu |
| E8-6 | Blog | TODO | |
| E8-7 | Newsletter z podwójnym potwierdzeniem | BLOCKED | = E4-5 (dostawca e-mail i zgoda na wysyłkę) |

## Zadania wymagające właściciela
| ID | Czego potrzeba | Status |
|---|---|---|
| OWN-1 | Repozytorium GitHub | DONE (`Patryha/PATRIX`) |
| OWN-2 | Dane firmy (nazwa, adres, NIP, REGON, kontakt) do regulaminu, stopki, faktur | BLOCKED (potrzebne od Etapu 3/8) |
| OWN-3 | Ceny, progi darmowej dostawy, cennik wysyłek | BLOCKED (Etap 3) |
| OWN-4 | Konta i klucze sandbox operatorów płatności i przewoźników | BLOCKED (Etap 6) |
| OWN-5 | Domena i hosting/staging | BLOCKED (Etap 10) |
| OWN-6 | Treść regulaminu i polityki prywatności (zatwierdzona prawnie) | BLOCKED (przed startem sprzedaży) |
| OWN-7 | Sklep stacjonarny: czy będzie, kasa fiskalna (online) i terminal płatniczy | Do decyzji (D-030) |
| OWN-8 | Zwroty: sposób odesłania i zasady (koszty, wyjątki) do formularza w koncie klienta | Do decyzji (karta w wątku) |
