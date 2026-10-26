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

## D-022 Zestawy jako natywne „inventory kits” Medusy
Zestaw to zwykły produkt, którego wariant ma kilka pozycji magazynowych (albo jedną w ilości > 1). Cenę zestawu ustala właściciel; sprzedaż zestawu rezerwuje i zdejmuje ze stanu składniki, więc dostępność zestawu wynika ze stanów składników. Skład pokazujemy na karcie produktu (endpoint szczegółów zwraca `bundles`), a sekcja CMS „Zestawy” pobiera listę z `/store/patrix/bundles`. Nie ma osobnego modelu danych do utrzymania.

## D-023 Menu i stopka jako osobna strona CMS (`layout`)
Ten sam mechanizm wersji, podglądu i publikacji co strona główna, z własnym schematem (`patrix-cms/layout.ts`). Startowa stopka zawiera tylko linki do istniejących stron; dane kontaktowe i opis firmy wpisuje właściciel, a puste pola nie są pokazywane. Obraz w menu wymaga opisu alt. Testy (`NODE_ENV=test`) używają modułów w pamięci i licznika limitów w pamięci, nawet jeśli `.env` ustawia `REDIS_URL`, aby nie dzielić zdarzeń z lokalnie działającym backendem.

## D-024 KPI liczone na bieżąco, kwoty tylko z uprawnieniem do finansów
Pulpit liczy wskaźniki przy każdym wejściu z zamówień z dwóch okresów (do 5000 zamówień), stanów magazynu i statusów danych produktów; przy dużym ruchu zastąpi to tabela agregatów (Etap 8). Dostęp: `order:read`; kwoty sprzedaży i średnia wartość zamówienia tylko z `finance:read` (np. magazynier widzi liczby, nie widzi kwot). Dni według strefy Europe/Warsaw.

## D-025 Role systemowe w kodzie, role własne w panelu
Role systemowe (właściciel, kierownik, magazyn, obsługa, marketing, księgowość) są definiowane w kodzie i synchronizowane przy starcie; panel ich nie zmienia. Właściciel tworzy role własne z macierzą obszar × odczyt/zapis/usuwanie; komplet operacji zapisuje się jako `obszar:*`. Roli przypisanej komuś nie można usunąć (409). Zaproszenia pracowników pozostają we wbudowanym ekranie Medusy (Ustawienia → Użytkownicy).

## D-026 Import CSV: tylko dane PATRIX, „wszystko albo nic”, bez potwierdzania etykiety
Produkty, warianty, EAN i ceny sprzedaży importuje wbudowany import Medusy (Produkty → Importuj); nie dublujemy go. Import PATRIX obejmuje dane z etykiety i producenta (po uchwycie) oraz ceny zakupu netto (po SKU, uprawnienie finansowe). Najpierw sprawdzenie (dry run) z wynikiem dla każdego wiersza; zapis tylko, gdy cały plik jest poprawny. Pusta komórka nie zmienia danych. Każda zmiana danych z etykiety cofa potwierdzenie etykiety (zmiana alergenów także ich potwierdzenie), więc dane wymagają weryfikacji przez człowieka; zmiana marki tego nie robi. Import nie zmienia danych produktów opublikowanych (najpierw wycofanie do szkicu albo edycja na karcie). XLSX: bez dodatkowej biblioteki (ryzyko podatności parserów); Excel zapisuje CSV, a panel rozpoznaje kodowanie UTF-8 i Windows-1250. Zmiany masowe wykonują się produkt po produkcie przez standardowy workflow Medusy, więc strażnik publikacji działa jak przy edycji pojedynczej.

## D-027 Magazyn: partie i dziennik obok natywnego stanu Medusy
Stan (na stanie, zarezerwowane) zostaje w natywnym module Inventory, z którego korzystają koszyk, rezerwacje i wysyłki; moduł `patrix-warehouse` dokłada partie (numer, data ważności z opakowania), dziennik ruchów i inwentaryzacje. Ruch z panelu PATRIX to workflow: zmiana stanu i wpis w dzienniku razem albo wcale. Sprzedaż zdejmuje partie według FEFO przy utworzeniu wysyłki (wtedy Medusa zmniejsza stan), anulowanie wysyłki je przywraca; przetwarzanie jest idempotentne. Towar sprzed ewidencji partii jest pokazywany jako „poza partiami” i może być wydany, zamiast blokować sprzedaż. Inwentaryzacja liczy różnicę względem stanu w chwili zatwierdzenia (nie otwarcia), więc sprzedaż w trakcie spisu nie jest księgowana podwójnie; pozycje nieprzeliczone nie zmieniają stanu. Ograniczenie: natywna edycja stanu w Medusie (Inventory) omija dziennik i partie, dlatego zmiany stanu robimy na stronie „Magazyn”; jej uprawnienie to `inventory`.

## D-028 Raporty magazynu: wartość tylko ze znanych cen zakupu, eksport CSV bez formuł
Wartość magazynu liczymy jako ilość na stanie × cena zakupu netto wariantu, który zawiera dokładnie jedną sztukę towaru (zestawy pomijamy). Towar bez ceny zakupu albo z różnymi cenami w kilku wariantach nie jest szacowany: raport podaje go osobno, żeby właściciel uzupełnił dane. Raport wymaga uprawnienia `finance:read` (reguła przed ogólną regułą magazynu). Eksport dziennika ruchów: CSV dla polskiego Excela (BOM, średnik, przecinek dziesiętny), okres w czasie polskim, maksymalnie 10 000 wierszy na plik; tekst zaczynający się od `= + - @` dostaje apostrof, żeby Excel nie wykonał go jako formuły. Przesunięcie MM to dwa wpisy w dzienniku (rozchód i przyjęcie) z partią źródłową i nową partią w celu o tym samym numerze i dacie ważności.

## D-029 Zwrot klienta wraca do partii, z której był sprzedany
Zwroty obsługuje natywny moduł zamówień Medusy (żądanie, przyjęcie, sztuki uszkodzone); Medusa zwiększa stan tylko o sztuki nieuszkodzone. Po przyjęciu (`order.return_received`) zapisujemy ruch „zwrot klienta” i oddajemy ilość do partii, z których ten towar wyszedł w przesyłkach tego zamówienia, zaczynając od najkrótszej daty ważności (konserwatywnie: nie zawyżamy terminu przydatności). Gdy zwrot przyjęto w innej lokalizacji, powstaje tam partia o tym samym numerze i dacie. Bez danych o partii ilość trafia poza partie. Kolejne częściowe przyjęcia dopisują tylko przyrost. Czy zwrócony towar (np. żywność, otwarte kosmetyki) może wrócić do sprzedaży, decyduje osoba przyjmująca zwrot (oznaczenie jako uszkodzony = nie wraca na stan).

## D-030 POS: gotowość przez API, bez własnej kasy
Nie budujemy aplikacji kasowej. Sklep stacjonarny będzie w Medusie osobnym kanałem sprzedaży z własną lokalizacją magazynową, więc stany, rezerwacje, partie (FEFO przy wysyłce/wydaniu) i raporty działają tak samo jak dla sklepu internetowego. Punktem integracji dla czytnika i przyszłego POS jest `GET /admin/patrix/warehouse/lookup?code=` (dokładne dopasowanie EAN, kodu kreskowego albo SKU, stan w lokalizacjach). Kasa fiskalna (w tym kasa online) i terminal płatniczy wymagają wyboru sprzętu i dostawcy przez właściciela oraz zgody na płatne usługi; do tego czasu nie integrujemy żadnej kasy.

## D-031 Centrum integracji: adaptery w kodzie, bez pozornych połączeń
Integracje opisuje manifest w kodzie, ale panel pozwala skonfigurować tylko te, które mają zaimplementowany adapter; pozostałe są „w przygotowaniu”. Adapter dostaje odszyfrowane dane dostępowe tylko na czas wywołania. Test połączenia to zawsze prawdziwe wywołanie API operatora, nigdy symulacja. Webhook jest przyjmowany (HTTP 200) po weryfikacji podpisu i zapisie, także gdy nasza obsługa się nie powiedzie: wtedy ponawiamy sami (wykładniczo, maks. 8 prób), zamiast polegać na ponowieniach operatora. Idempotencja: unikalny indeks (adapter, identyfikator zdarzenia) + idempotentna obsługa w adapterze. Tryb produkcyjny odblokowuje właściciel zmienną `PATRIX_ALLOW_PRODUCTION_INTEGRATIONS=true`; do tego czasu wszystkie połączenia działają tylko w trybie testowym. Płatności i dostawy będą providerami Medusy korzystającymi z tych adapterów (status płatności wyłącznie z podpisanego webhooka).

## D-032 Wyszukiwarka we własnym silniku w pamięci zamiast Meilisearch (na razie)
Plan zakładał Meilisearch. Przy obecnej skali katalogu (setki, najwyżej kilka tysięcy produktów) indeks w pamięci backendu (`src/lib/search.ts`) daje to samo, co było potrzebne: literówki (odległość edycyjna 1–2 zależnie od długości słowa), brak polskich znaków i niemieckie znaki (ą→a, ß→ss, ü→u), początek słowa podczas pisania, części słów złożonych („mittel” w „Waschmittel”), synonimy z panelu (także wielowyrazowe), dokładne kody EAN/SKU oraz wagi pól (nazwa > marka i nazwa oryginalna z etykiety > kategoria > opis). Nie wymaga dodatkowej usługi, synchronizacji ani kosztów i jest w pełni testowalny jednostkowo. Indeks obejmuje tylko produkty opublikowane, wyniki są zawężane do kanałów sprzedaży klucza publicznego; buduje się przy pierwszym zapytaniu, odświeża najpóźniej po 60 s, a zmiany produktów, kategorii i synonimów unieważniają go od razu (przy kilku instancjach backendu decyduje limit 60 s). Ceny i dostępność sklep pobiera ze standardowego Store API. Statystyki fraz są zapisywane bez żadnych danych klienta i służą do dopisywania synonimów. Gdy katalog przekroczy ok. 20 tys. produktów albo potrzebne będą fasety liczone po stronie wyszukiwarki, wymienimy silnik na Meilisearch za tym samym API (`/store/patrix/search`).

## D-033 Rekomendacje z danych sklepu, bez profilowania klienta
„Często kupowane razem” liczymy ze współwystępowania produktów w zamówieniach z 180 dni (bez anulowanych i szkiców); para musi wystąpić w co najmniej 2 różnych zamówieniach, żeby rekomendacja nie zdradzała zawartości koszyka jednego klienta. „Podobne produkty” pochodzą z tej samej kategorii, a kolejność ustalają marka, typ i tagi (sama marka nie wystarcza: ciastka nie polecają płynu tej samej marki). Nie używamy historii przeglądania ani danych osobowych, więc nie jest to profilowanie i nie wymaga zgody. Dane liczone w pamięci backendu, odświeżane co 10 minut i po zmianach katalogu; tylko opublikowane produkty z kanału sprzedaży sklepu. Sekcja bez danych (np. przed pierwszymi zamówieniami) się nie pokazuje, a produkty dostępne są stawiane przed niedostępnymi.

## D-034 SEO: mapa strony, robots i przekierowania z panelu
`/sitemap.xml` obejmuje stronę główną, kategorie, marki z produktami i opublikowane produkty (bez stron `noindex`: koszyk, konto, wyszukiwarka, regulamin do czasu treści od właściciela). `/robots.txt` blokuje wszystko, dopóki serwer nie ma `NEXT_PUBLIC_ALLOW_INDEXING=true` (włączamy przy starcie produkcji, razem z metatagiem robots), żeby staging nie trafił do wyszukiwarek. Przekierowania 301/302 zarządza marketing w panelu (uprawnienie `content`); tylko ścieżki wewnątrz sklepu (bez otwartych przekierowań), bez łańcuchów i pętli, bez adresów panelu. Sklep (proxy Next.js) trzyma listę w pamięci przez minutę; awaria backendu nie blokuje sklepu. Parametry zapytania (np. UTM) przechodzą na nowy adres.

## D-035 Zgody na cookies: własny lekki baner, narzędzia dopiero po zgodzie
Bez zewnętrznej platformy CMP (koszt i dodatkowy skrypt). Sklep sam używa tylko plików niezbędnych, więc baner pojawia się dopiero wtedy, gdy właściciel poda identyfikator narzędzia (`NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`). Przed zgodą nie ładujemy żadnego skryptu narzędzia (ostrzej niż sam tryb zgody Google). „Akceptuj wszystkie” i „Odrzuć opcjonalne” są równorzędne wizualnie; „Ustawienia” pozwalają wybrać kategorię. Zgoda w cookie `patrix_consent` na 180 dni z wersją: zmiana listy narzędzi podbija `CONSENT_VERSION` i klient jest pytany ponownie. Zmiana zgody: „Ustawienia cookies” w stopce; cofnięcie przeładowuje stronę. GA4 działa z trybem zgody v2 (reklamy odrzucone). Treść polityki prywatności i lista odbiorców danych należą do właściciela (OWN-6). Rejestr zgód po stronie serwera (dowód zgody) dodamy, jeśli zażąda go prawnik właściciela.

## D-036 Feed Google Merchant Center generowany przez sklep
`/feed/google.xml` (RSS 2.0, przestrzeń `g:`) budowany ze Store API, czyli z tych samych cen (region PLN, promocje jako `sale_price`), stanów i kanału sprzedaży co sklep; odświeżany co godzinę. Jedna pozycja na wariant (`item_group_id` = produkt), link prowadzi na kartę z wybranym wariantem (`?wariant=`), adres kanoniczny karty się nie zmienia. Pomijamy warianty bez ceny i produkty bez zdjęcia (Google je odrzuca). GTIN wysyłamy tylko z poprawną cyfrą kontrolną i spoza puli wewnętrznej (prefiks 2 itp.); bez GTIN i bez pary marka + SKU ustawiamy `identifier_exists=no`. Stan „nowy” wynika z modelu sprzedaży (oryginalne nowe produkty); żadne inne dane nie są uzupełniane domyślnie. Koszty dostawy i zwroty ustawia się w koncie Merchant Center właściciela (zależą od cennika OWN-3). Google pobiera feed zgodnie z robots.txt, więc działa dopiero po włączeniu indeksowania na produkcji (D-034); konto Merchant Center i podpięcie adresu należą do właściciela (OWN-10).

## D-037 Blog w module CMS, treść w prostym formacie zamiast HTML
Wpisy (`blog_post`) mieszkają w module `patrix-cms`, zarządza nimi rola z uprawnieniem `content` (panel „Blog”). Treść to zwykły tekst z kilkoma znacznikami (akapity, nagłówki `##`/`###`, listy `- `, `**pogrubienie**`, `[tekst](adres)`), a nie HTML z edytora WYSIWYG: sklep zamienia ją na elementy React, więc z bazy nie trafia na stronę żaden HTML i nie potrzebujemy sanitizera. Linki: tylko ścieżki sklepu albo `https://` (sprawdza backend przy zapisie i drugi raz sklep). Adres wpisu jest stały od pierwszej publikacji (także po wycofaniu do szkicu), bo prowadzą do niego linki i wyszukiwarki; data publikacji to data pierwszej publikacji. Okładka wymaga opisu alternatywnego; sklep pokazuje ją tylko z hostów zdjęć skonfigurowanych w `NEXT_PUBLIC_IMAGE_HOSTS` albo ze ścieżki sklepu. Pod wpisem można polecić do 8 produktów (nieopublikowane się nie pokazują). Pusty blog ma `noindex` i nie trafia do mapy strony. Autora wpisu nie pokazujemy, dopóki właściciel nie zdecyduje, kto podpisuje treści; wydawcą w danych strukturalnych jest PATRIX. Link do bloga w menu lub stopce dodaje się w panelu „Menu i stopka”. Treści wpisów pisze właściciel albo zespół (nie generujemy porad o produktach).

## D-038 CSP: wszystko z własnej domeny, 'unsafe-inline' tylko dla skryptów
Sklep wysyła pełną politykę CSP (`src/lib/csp.ts`): `default-src`, `connect-src`, `img-src`, `font-src`, `worker-src` tylko z własnej domeny (zdjęcia idą przez optymalizator Next na tej samej domenie), `frame-src` i `frame-ancestors` zablokowane, `object-src 'none'`, `base-uri` i `form-action` ograniczone do sklepu, `upgrade-insecure-requests` przy adresie https. Domeny Google Analytics i Meta dochodzą tylko wtedy, gdy ustawiono ich identyfikator (D-035), więc sklep bez analityki nie pozwala na żadne zewnętrzne skrypty. Nonce (wariant „ściśle”) odrzuciliśmy: Next.js wymaga wtedy renderowania każdej strony na żądanie i wyłącza częściowe prerenderowanie, co pogarsza czas ładowania; hashy nie da się użyć, bo skrypty z danymi strony są różne dla każdej strony. Dlatego `script-src` ma `'unsafe-inline'` (bez `'unsafe-eval'` w produkcji), a ochrona przed XSS opiera się na tym, że do HTML nie trafia żaden HTML z bazy. Test E2E sprawdza nagłówek i brak naruszeń na stronach sklepu. Nagłówki panelu Medusy (`/app`) ustawia backend i reverse proxy (bez zmian).
