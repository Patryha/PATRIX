# Raport testów

Ostatnie uruchomienie: 2026-10-26 (Etap 5: magazyn), lokalnie (PostgreSQL 16, Redis 7, Chromium 1243).

| Zestaw | Polecenie | Wynik |
|---|---|---|
| Backend: typy | `npm run typecheck` | OK |
| Backend: jednostkowe | `npm run test:unit` | 72/72 OK |
| Backend: integracyjne HTTP | `npm run test:integration:http` | 38/38 OK |
| Backend: build (API + panel) | `npx medusa build` | OK |
| Storefront: lint | `npm run lint` | OK |
| Storefront: typy | `npm run typecheck` | OK |
| Storefront: jednostkowe/komponenty | `npm test` | 33/33 OK |
| Storefront: build produkcyjny | `npm run build` | OK |
| Storefront: E2E (desktop + Pixel 7) | `npm run test:e2e` | 66/66 OK (backend w trybie produkcyjnym, katalog [TEST]) |
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
- **CMS (Etap 4):** pełny cykl (brak publikacji → 404 w sklepie, szkic, token podglądu, publikacja unieważnia token, nowa kolejność, archiwum, historia, przywrócenie jako nowa wersja), odrzucanie niepoprawnej treści i niebezpiecznych linków (`javascript:`, `//`, `http:`), nieznane pola i strony, 403 dla magazyniera. Jednostkowo: schematy sekcji (alt przy obrazie, pełne CTA, reguły sekcji produktów, unikalne id, jeden pasek).
- **E2E (Etap 4):** kolejność sekcji z CMS, „Promocje tygodnia” tylko z produktami w promocji i bez przekreślonych cen na kartach, ostatnio oglądane (karta produktu i strona główna, kolejność), axe na stronie głównej, podgląd z błędnym tokenem i `noindex`; ulubione (gość → licznik → przeładowanie → `/ulubione` z axe → rejestracja przenosi listę → wylogowanie → logowanie → usunięcie), zestaw (sekcja „Zestawy”, skład „W zestawie” z linkiem do składnika), stopka z CMS (kolumny linków, brak danych kontaktowych bez wpisu właściciela). Integracyjnie: strona `layout` z własnym schematem (alt przy obrazie, telefon, odrzucenie treści strony głównej), podgląd i publikacja. Panel sprawdzony ręcznie w przeglądarce (przeciąganie, walidacja linku, podgląd, odrzucenie szkicu).

- **Panel (Etap 4, E4-9):** KPI: okresy 7/30/90, strefa Europe/Warsaw (także po zmianie czasu), pominięcie anulowanych i szkiców, porównanie okresów, niski stan (suma lokalizacji minus rezerwacje); integracyjnie: właściciel widzi kwoty, magazynier tylko liczby, marketing 403. Role: lista pracowników z rolami (kierownik 403), edycja roli własnej, odrzucenie nieznanych uprawnień i zmiany uchwytu, blokada edycji i usuwania ról systemowych, 409 dla roli przypisanej, audyt usunięcia. Oba ekrany panelu sprawdzone w przeglądarce (Playwright, konto lokalne). Import: parser CSV (średnik/przecinek, BOM, cudzysłowy, nowe linie w polach, polskie liczby), mapowanie kolumn, cofanie potwierdzeń; integracyjnie: nieznane kolumny, sprawdzenie z błędami (brak produktu, brak marki, zły UFI), odmowa zapisu pliku z błędami bez zmian w bazie, zapis poprawnego pliku jako „do weryfikacji”, ponowny import „bez zmian”, blokada zmian produktu opublikowanego, ceny zakupu (403 bez finansów, nieznane SKU), audyt. Zmiany masowe: publikacja tylko kompletnych (drugi produkt odrzucony z komunikatem), marka bez cofania weryfikacji, dodanie i usunięcie kategorii, brak kategorii → 400, magazynier 403. Ekran sprawdzony w przeglądarce, także plik CSV w Windows-1250.

## Znane ograniczenia testów
- Docker Compose i obrazy nie zostały zbudowane (brak daemona Dockera w środowisku budowy).
- Skan DAST (HawkScan) nie uruchomiony: brak klucza API StackHawk; zaplanowany w Etapie 9.
- Strona 404 dla nieistniejącej kategorii/produktu zwraca HTTP 200 z `noindex` (ograniczenie strumieniowania w Next.js z Cache Components); do rozwiązania w Etapie 8 (SEO) przez `generateStaticParams`/weryfikację w proxy.

- **E2E (Etap 3):** koszyk (dodanie, licznik w nagłówku, błędny i poprawny kod rabatowy, usunięcie kodu i produktu), zamówienie jako gość z fakturą na firmę (walidacja pól i NIP, dostawa, pobranie, kwota 31,97 zł, potwierdzenie z danymi faktury, pusty koszyk po zamówieniu), przekierowanie pustego koszyka, potwierdzenie bez ciasteczka nic nie ujawnia; konto (rejestracja z walidacją hasła, przeniesienie koszyka, zakup jako klient, zamówienie w historii, wylogowanie, błędne i poprawne logowanie, ochrona przed przekierowaniem poza sklep); axe WCAG 2.2 AA w koszyku, checkoutcie i rejestracji.
- **Unit (Etap 3):** NIP (suma kontrolna), kod pocztowy, schemat adresu i faktury, rejestracja (siła hasła, regulamin), `safeRedirect`.
- Test historii cen (subskrybent asynchroniczny) bywał zbyt wolny przy pełnym zestawie; czas oczekiwania wydłużony do 15 s. Właściwa przyczyna: testy wczytują `.env` z `REDIS_URL`, więc działający lokalnie backend przejmował zdarzenia. Od D-023 testy (`NODE_ENV=test`) zawsze używają modułów w pamięci.
- **Magazyn (Etap 5):** przyjęcie tworzy partię, wydanie według FEFO (najkrótsza data ważności najpierw, partie bez daty na końcu), wybór partii, za mało dostępnego towaru (z rezerwacjami) → błąd bez zmian w stanie i dzienniku, cofnięcie stanu przy błędzie zapisu w dzienniku, korekta z partią, wysyłka zamówienia zdejmuje partie FEFO i jest idempotentna, anulowanie wysyłki przywraca partie, inwentaryzacja (zapis, zatwierdzenie z różnicą, pozycje nieprzeliczone bez zmian, ponowne zatwierdzenie odrzucone), raport dat ważności. Jednostkowo: kolejność FEFO, przydział z partii z częścią poza partiami, stan daty ważności, znak ilości. Panel „Magazyn” sprawdzony w przeglądarce kontem magazyniera (przyjęcie, wydanie z wyborem partii, blokada korekty bez powodu, stany, raport dat, arkusz inwentaryzacji).
- **Magazyn: przesunięcia i raporty:** przesunięcie MM rozdziela partie według FEFO i odtwarza je w celu z tą samą datą ważności; za duża ilość, ta sama lokalizacja i zła partia nic nie zmieniają; eksport CSV (nagłówki, wiersze, apostrof przed formułą, filtr okresu, błędna data → 400); wartość magazynu (cena zakupu × ilość, pozycja bez ceny osobno, 403 bez uprawnienia do finansów). Jednostkowo: zapis CSV dla Excela z odczytem z powrotem, cena zakupu sztuki (zestawy pominięte, sprzeczne ceny bez zgadywania).
