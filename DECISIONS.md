# Rejestr decyzji (ADR)

## D-001 (2026-10-23) Silnik commerce: Medusa v2 (2.22.1)
**Decyzja:** backend na Medusa v2 (Node/TypeScript, PostgreSQL, Redis).
**Uzasadnienie:** dojrzałe, utrzymywane moduły: produkty i warianty, ceny i cenniki, promocje, koszyk, zamówienia, zwroty/wymiany/reklamacje, podatki, regiony i waluty (wiele rynków), magazyny i rezerwacje stanów (wiele lokalizacji), dostawcy płatności i wysyłek jako moduły, workflow z kompensacją, natywne MFA (TOTP + kody zapasowe), panel administracyjny rozszerzalny o własne widoki. Spełnia wymóg „nie implementuj od zera tego, co jest dobrze rozwiązane”.
**Konsekwencje:** funkcje specyficzne dla PATRIX (partie/daty ważności/FEFO, dane prawne produktów, CMS, centrum integracji, historia cen Omnibus) powstają jako własne moduły Medusy, bez modyfikacji rdzenia.

## D-002 Storefront: własna aplikacja Next.js 16 (App Router, Cache Components)
Starter Medusy nie odpowiada wymaganiom wizualnym PATRIX; budujemy własny storefront z design systemem PATRIX, korzystając z `@medusajs/js-sdk`. Dane sklepu pobierane po stronie serwera z `use cache` + `cacheLife` + `cacheTag` i strumieniowane w `<Suspense>` (statyczna powłoka + dane, dobre CWV).

## D-003 Monorepo bez wspólnego menedżera workspace
`apps/backend` i `apps/storefront` mają osobne `package-lock.json` (różne wersje React: panel Medusy React 18, storefront React 19). Prostsze i stabilniejsze niż hoisting w workspace.

## D-004 Role pracowników: własna implementacja PATRIX zamiast RBAC Medusy
**Kontekst:** w Medusie 2.22 RBAC i SSO/OIDC są częścią **Medusa Enterprise Edition** (licencja komercyjna; włączenie flagi RBAC oznacza deklarację posiadania licencji).
**Decyzja:** nie używamy materiałów EE. Moduł `patrix-security` zawiera role (`staff_role`), przypisania i katalog uprawnień `zasób:operacja`. Middleware `authorizeAdminRequest` autoryzuje każde żądanie `/admin` na podstawie mapy tras; **trasy nieznane wymagają pełnych uprawnień (deny-by-default)**. Konto bez roli nie ma dostępu.
**Role systemowe:** Właściciel, Kierownik sklepu, Magazynier, Obsługa klienta, Marketing, Księgowość (dane finansowe: ceny zakupu i marże tylko z `finance:read`).
**Do decyzji właściciela (opcjonalnie):** zakup licencji Medusa EE (RBAC w panelu Medusy, SSO). Nie jest potrzebny do uruchomienia sklepu.

## D-005 MFA: natywne MFA Medusy + polityka PATRIX
Natywne MFA (TOTP, kody zapasowe, wyzwanie przy logowaniu, konfiguracja w profilu panelu). `ADMIN_MFA_ENFORCEMENT=required` (zalecane w produkcji) blokuje panel kontom bez aktywnego MFA, z wyjątkiem endpointów potrzebnych do jego konfiguracji.

## D-006 Ceny brutto w PLN, VAT 23% domyślnie
Ceny wprowadzane i prezentowane jako brutto (preferencja cenowa `is_tax_inclusive` dla PLN i regionu Polska). Stawka domyślna 23%. Stawki obniżone (8%, 5%, 0%) przypisywane per typ/kategoria produktu w Etapie 3, po weryfikacji z księgowością właściciela — nie zgadujemy stawek dla konkretnych produktów.

## D-007 Panel administratora pod `/admin`
Panel to Medusa Admin (`<backend>/app`) z rozszerzeniami PATRIX. Ścieżka `/admin` w domenie sklepu przekierowuje do panelu (`PATRIX_ADMIN_URL`). API administracyjne Medusy także używa prefiksu `/admin`, dlatego panel nie może mieć tej samej ścieżki w domenie backendu.

## D-008 Paleta i dostępność
Kolory marki bez zmian; dla tekstu i przycisków dodane warianty „strong” spełniające WCAG AA (teal #007D74, pomarańcz #A84A0C dla tekstu; pomarańczowe tło z granatowym tekstem). Teal #00A99D i pomarańcz #FF8A3D na białym tle mają kontrast 2,8:1 i 2,2:1, więc służą jako akcenty i tła, nie kolor tekstu. Motyw ciemny opcjonalny (przełącznik + preferencja systemu). Kolory to zmienne CSS `--px-*`; nadpisania z panelu są walidowane (tylko HEX), by uniemożliwić wstrzyknięcie CSS.

## D-009 Wyszukiwarka
Etap 1 używa wyszukiwania Medusy (`q`). Etap 7: Meilisearch (literówki, synonimy, PL/DE, EAN) jako warstwa podstawowa; AI wyłącznie jako dodatek.

## D-010 Nagłówki bezpieczeństwa na brzegu
Medusa zwraca część odpowiedzi (np. 401 z uwierzytelniania) przed middleware aplikacji. Komplet nagłówków (HSTS, nosniff, X-Frame-Options, Referrer-Policy) ustawia reverse proxy Caddy; aplikacje ustawiają je dodatkowo dla własnych odpowiedzi.

## D-011 Dane prawne produktu we własnym module, blokada publikacji w hookach workflow
Dane wymagane prawem (GPSR, 1169/2011, CLP, 1223/2009) trzymamy w module `patrix-catalog` (tabela `product_compliance`, jeden rekord na produkt), a nie w `metadata`, żeby mieć typy, walidację i zapytania. Publikację blokują hooki `createProductsWorkflow.productsCreated` i `updateProductsWorkflow.productsUpdated`: błąd wycofuje cały workflow, więc blokada działa dla panelu, API, operacji masowych i importu CSV. Klient widzi dane dopiero po potwierdzeniu zgodności z polską etykietą (`polish_label_verified`).

## D-012 Omnibus: historia cen sprzedaży
Zapisujemy cenę wyliczoną dla regionu PLN (z cennikami promocyjnymi) przy każdej zmianie: od razu po zmianie produktu i co 15 minut (zadanie cykliczne). Najniższa cena z 30 dni liczona jest przed momentem wprowadzenia obecnej ceny, z uwzględnieniem ceny obowiązującej na początku okna. Przekreśloną cenę i znaczek promocji pokazujemy tylko razem z tą informacją.

## D-013 Filtry listingu po stronie sklepu do czasu Meilisearch
Store API Medusy nie sortuje po cenie wyliczonej. Do Etapu 7 listing pobiera do 500 produktów kategorii lub wyników i filtruje/sortuje je na serwerze Next.js (z cache). Wystarcza dla katalogu startowego; Meilisearch zastąpi to w Etapie 7.

## D-014 Sesja klienta w ciasteczkach httpOnly, SDK bez stanu
Koszyk (`patrix_cart`) i token klienta (`patrix_customer`) trzymamy w ciasteczkach httpOnly, SameSite=Lax, Secure na produkcji. Token przekazujemy w nagłówku `Authorization` przy każdym żądaniu; nie używamy `sdk.auth.login`, bo SDK jest współdzielone przez wszystkie żądania serwera. Po wylogowaniu koszyk jest usuwany z przeglądarki.

## D-015 Płatność przy odbiorze do czasu integracji operatorów
Jedyną metodą płatności w Etapie 3 jest płatność przy odbiorze (`pp_system_default`). Płatności online (Etap 6) będą potwierdzane wyłącznie zweryfikowanym powiadomieniem operatora (webhook z podpisem). Potwierdzenie zamówienia jest powiązane z ciasteczkiem przeglądarki, a nie z identyfikatorem w adresie.

## D-016 Dane do faktury w adresie rozliczeniowym
Nazwa firmy trafia do `billing_address.company`, NIP do `billing_address.metadata.nip` (oraz metadanych koszyka/zamówienia). API sklepu nie zwraca metadanych zamówienia, a adres rozliczeniowy tak; dane przechodzą też do panelu.

## D-017 (2026-10-26) CMS strony głównej: wersje w module PATRIX, treść jako JSON z walidacją
Strona główna to lista sekcji (typ, id, widoczność, pola) zapisywana jako wersja: szkic, opublikowana albo archiwalna. Publikacja archiwizuje poprzednią wersję, przywrócenie tworzy nowy szkic. Schemat sekcji jest sprawdzany w backendzie przy każdym zapisie; linki tylko do ścieżek sklepu lub `https://`. Sklep odczytuje wyłącznie opublikowaną wersję i buforuje ją kilka minut.

## D-018 Podgląd szkicu przez jednorazowy token
Panel generuje losowy token (32 bajty), w bazie zapisujemy tylko skrót SHA-256; token wygasa po 60 minutach i przy publikacji. Strona `/podglad` ma `noindex` i nie jest buforowana.

## D-019 Bestsellery z zamówień z ostatnich 30 dni
Ranking liczony z ilości w zamówieniach (bez anulowanych i szkiców) z 30 dni, buforowany 5 minut. Przy dużym ruchu zastąpi go tabela agregatów (Etap 5/8).

## D-020 Ostatnio oglądane tylko w przeglądarce
Lista uchwytów produktów w `localStorage` (maks. 12), bez wysyłania na serwer poza pobraniem kart produktów; nie wymaga zgody na śledzenie.

## D-021 Ulubione: ciasteczko gościa, metadane konta klienta
Gość: lista uchwytów w ciasteczku httpOnly `patrix_fav` (do 60 pozycji, 180 dni). Klient: `customer.metadata.patrix_favorites`, więc lista jest dostępna na każdym urządzeniu; po zalogowaniu lista gościa jest dołączana do konta, a ciasteczko usuwane. Dane są czyszczone przy każdym odczycie (tylko poprawne uchwyty). Osobny moduł w backendzie nie jest potrzebny, dopóki nie ma powiadomień o obniżkach ulubionych (wymagałyby zgody i dostawcy e-mail).
