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

## 2026-10-23: Etap 3 (koszyk, checkout, klienci)
- Koszyk z kodami rabatowymi, licznik w nagłówku, pasek zakupu na telefonie.
- Checkout w jednym widoku: dane i adres (walidacja PL), dostawa z backendu, płatność przy odbiorze, faktura na firmę z kontrolą NIP, akceptacja regulaminu, potwierdzenie zamówienia.
- Konto klienta: rejestracja, logowanie, przeniesienie koszyka, historia zamówień, wylogowanie. Token klienta tylko w ciasteczku httpOnly, nigdy we współdzielonym SDK.
- Katalog testowy: dodane „[TEST] Kurier testowy” (12,99 zł, kwota testowa) i kod TEST10.
- Strony regulaminu i polityki prywatności istnieją, ale bez treści: tekst przygotowuje właściciel (OWN-6).
- Testy: E2E 52/52 (pełny zakup jako gość i jako klient, axe WCAG 2.2 AA), storefront unit 28/28.
- Następny krok: Etap 4 (CMS strony głównej, sekcje edytowalne).

## 2026-10-26: Etap 4 (strona główna edytowalna z panelu)
- Moduł `patrix-cms`: wersje strony (szkic, opublikowana, archiwum), historia i przywracanie, walidacja sekcji po stronie serwera, linki tylko wewnętrzne lub `https://`.
- Panel „Strona główna”: lista sekcji z przeciąganiem i przyciskami ↑/↓, włączanie/wyłączanie, edycja pól, dodawanie i usuwanie sekcji, podgląd szkicu, publikacja, historia wersji. Dostęp przez uprawnienie `content` (kierownik, marketing).
- Sklep: strona główna składana z sekcji CMS (pasek informacyjny, slider, kategorie, nowości, promocje tygodnia, bestsellery, polecane, ostatnio oglądane, o marce, dostawy i płatności); zapasowy układ, gdy CMS jest niedostępny. Ostatnio oglądane także na karcie produktu.
- Seed publikuje startową wersję strony (tylko teksty o marce, bez danych firmy i cen).
- Testy: backend unit 49/49, integracyjne 21/21, storefront unit 30/30, E2E 60/60.
- Nie zrobione w tym kroku: newsletter (wymaga dostawcy e-mail i zgody), ulubione, zestawy, mega menu z grafikami, KPI, import.

## 2026-10-26: Etap 4 (ulubione, zestawy, menu i stopka)
- Ulubione: przycisk na karcie produktu, strona `/ulubione`, licznik w nagłówku; gość w ciasteczku, klient na koncie; po zalogowaniu lista gościa trafia na konto (D-021).
- Zestawy: natywne zestawy magazynowe Medusy, skład „W zestawie” na karcie produktu, nowe źródło sekcji CMS „Zestawy” (D-022).
- Menu i stopka z panelu: grafiki kategorii w menu (z opisem alt), kolumny linków, opis sklepu, kontakt i dopisek w stopce; szkic, podgląd, publikacja i historia wersji jak dla strony głównej. Wspólny kod panelu CMS w `src/admin/lib/cms-page.tsx` (D-023).
- Testy integracyjne nie korzystają już z lokalnego Redisa (wcześniej działający backend deweloperski przechwytywał zdarzenia testów).
- Testy: backend unit 52/52, integracyjne 22/22, storefront unit 33/33, E2E 66/66.

## 2026-10-26: Etap 4 (panel: KPI, pracownicy i role)
- „Pulpit sprzedaży”: zamówienia, sprzedaż brutto, średnia wartość zamówienia (7/30/90 dni, porównanie z poprzednim okresem), zamówienia dziennie (wykres i tabela), najczęściej kupowane, do wysłania, nowe konta, niski stan magazynu, stan danych produktów. Kwoty widzą tylko osoby z uprawnieniem do finansów (D-024).
- „Pracownicy i role”: lista pracowników z rolami i ich zmiana, role własne z macierzą uprawnień (tworzenie, edycja, usuwanie; rola przypisana nie może zostać usunięta), podgląd ról systemowych. Zmiany ról w dzienniku audytu.
- Testy: backend unit 57/57, integracyjne 25/25; oba ekrany panelu sprawdzone w przeglądarce.
- „Import i zmiany masowe”: import CSV danych produktów (producent, skład, ilość, alergeny, marka i in.) po uchwycie oraz cen zakupu po SKU; najpierw sprawdzenie, zapis tylko całego poprawnego pliku; import nie potwierdza etykiety i nie zmienia produktów opublikowanych (D-026). Zmiany masowe: publikacja (ze strażnikiem kompletności), wycofanie do szkicu, marka, kategoria. Pliki z Excela w Windows-1250 są odczytywane poprawnie.
- Naprawiony niestabilny test E2E „ostatnio oglądane” (czekanie na zapis po hydratacji).
- Testy: backend unit 66/66, integracyjne 29/29, storefront unit 33/33, E2E 66/66 (test „ostatnio oglądane” 20/20 powtórzeń).

## 2026-10-26: Etap 5 (magazyn: partie, FEFO, inwentaryzacja)
- Moduł `patrix-warehouse`: partie z numerem i datą ważności, dziennik ruchów (przyjęcie, wydanie, korekta, sprzedaż, inwentaryzacja), inwentaryzacje. Stan towaru zostaje w natywnym module Medusy, więc koszyk i rezerwacje działają bez zmian (D-027).
- Przyjęcia, wydania i korekty jako jedna operacja: zmiana stanu i wpis w dzienniku razem albo wcale. Wydanie nie zabiera towaru zarezerwowanego dla zamówień.
- Sprzedaż zdejmuje towar z partii z najkrótszą datą ważności przy wysyłce; anulowanie wysyłki przywraca partie.
- Inwentaryzacja: arkusz dla lokalizacji, zatwierdzenie księguje różnice. Raport dat ważności (7/30/90 dni).
- Panel „Magazyn” (stany, ruchy, daty ważności, inwentaryzacja) sprawdzony w przeglądarce kontem magazyniera.
- Testy: backend unit 70/70, integracyjne 35/35, storefront unit 33/33, E2E 66/66.

## 2026-10-26: Etap 5 (przesunięcia, raporty)
- Przesunięcia między magazynami (MM): towar i partie przechodzą razem, z numerem partii i datą ważności.
- Eksport dziennika ruchów do CSV (Excel: średnik, polskie znaki, okres od–do).
- Wartość magazynu w cenach zakupu netto, tylko dla osób z uprawnieniem do finansów; towar bez ceny zakupu jest wykazany osobno, nie szacujemy go (D-028).
- Testy: backend unit 72/72, integracyjne 38/38, storefront unit 33/33, E2E 66/66; panel sprawdzony w przeglądarce (magazynier i właściciel).

## 2026-10-26: Etap 5 (zwroty w magazynie)
- Przyjęty zwrot klienta (w panelu Medusy) zapisuje ruch „zwrot klienta” i oddaje sztuki do partii, z których były sprzedane w tym zamówieniu; uszkodzone sztuki nie wracają na stan (D-029).
- Formularz zwrotu dla klienta czeka na decyzję właściciela (sposób odesłania i zasady z regulaminu).
- Testy: backend unit 72/72, integracyjne 39/39, storefront unit 33/33, E2E 66/66.
