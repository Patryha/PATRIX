# Instrukcja panelu PATRIX

Panel administracyjny: `https://<domena API>/app` (w sklepie adres `/admin` przekierowuje do panelu).
Instrukcja opisuje funkcje PATRIX dodane do panelu Medusa. Standardowe ekrany (Zamówienia, Produkty, Klienci, Promocje, Ustawienia) działają jak w dokumentacji Medusa.

## 1. Pierwsze logowanie i bezpieczeństwo
1. Właściciel zaprasza pracownika (Ustawienia → Użytkownicy) i nadaje mu rolę w **Pracownicy i role**.
2. Pracownik po pierwszym logowaniu włącza weryfikację dwuetapową (profil → MFA, aplikacja uwierzytelniająca, np. Google Authenticator lub Aegis) i zapisuje kody zapasowe w bezpiecznym miejscu.
3. Na produkcji konto bez MFA nie ma dostępu do niczego poza konfiguracją MFA (`ADMIN_MFA_ENFORCEMENT=required`).
4. Każda zmiana w panelu i każde logowanie (także nieudane) trafia do dziennika audytu.

## 2. Role
Konto bez roli nie widzi danych (zasada „domyślnie zabronione”). Role systemowe:

| Rola | Zakres |
|---|---|
| Właściciel | Wszystko, w tym role i pracownicy. Sklep zawsze ma co najmniej jednego właściciela. |
| Kierownik sklepu | Produkty, magazyn, zamówienia, klienci, promocje, treści; podgląd finansów, ustawień i dziennika audytu. Bez nadawania ról. |
| Magazynier | Stany, przyjęcia, kompletacja i wysyłka; podgląd produktów i zamówień. Bez cen zakupu. |
| Obsługa klienta | Zamówienia, zwroty, reklamacje, klienci; podgląd produktów, magazynu i promocji. Bez cen zakupu. |
| Marketing | Opisy i SEO produktów, promocje, treści i blog, zdjęcia. Bez cen zakupu. |
| Księgowość | Podgląd zamówień, klientów, produktów, cen zakupu i marż. |

Role własne tworzy właściciel w **Pracownicy i role → Role własne** (odczyt, zapis lub usuwanie osobno dla każdego obszaru). Ról systemowych nie można zmienić ani usunąć.

## 3. Codzienna praca

### Pulpit sprzedaży
Sprzedaż i zamówienia za 7, 30 lub 90 dni z porównaniem do poprzedniego okresu, zamówienia dziennie, najczęściej kupowane produkty, niski stan magazynu i kompletność danych katalogu. Kwoty widzą tylko role z dostępem do finansów; pozostali widzą liczby.

### Produkty
- Na karcie produktu jest sekcja **Dane produktu PATRIX**: rodzaj (żywność, chemia, kosmetyk, inne), marka, producent i podmiot odpowiedzialny (GPSR), ilość, dane z etykiety (skład, alergeny, wartości odżywcze, oznakowanie CLP, dane kosmetyku).
- **Produktu nie da się opublikować, dopóki dane wymagane dla jego rodzaju nie są kompletne i zweryfikowane z etykietą.** Panel pokazuje, czego brakuje. Danych nie uzupełniamy „na oko”: tylko z etykiety lub dokumentów producenta.
- Ceny zakupu (netto) są w osobnej sekcji, widocznej tylko dla ról z dostępem do finansów.
- Każda zmiana ceny trafia do historii cen. Przekreślona cena pokazuje się w sklepie tylko razem z najniższą ceną z 30 dni (dyrektywa Omnibus).

### Marki
Lista marek z opisem i logo. Marki przypisanej do produktów nie da się usunąć.

### Import i zmiany masowe
- **Import z pliku CSV:** dane z etykiet (producent, skład, ilość, marka) albo ceny zakupu (netto, po SKU). Najpierw sprawdzenie pokazuje błędy wiersz po wierszu; plik z błędami nie zmienia niczego w bazie. Zaimportowane dane dostają status „do weryfikacji”. Pliki z Excela są obsługiwane (średnik lub przecinek, także kodowanie Windows-1250).
- **Zmiany masowe:** publikacja zaznaczonych produktów (tylko kompletnych; pozostałe są pomijane z komunikatem), zmiana marki, dodanie lub usunięcie kategorii.

### Magazyn
Zakładki:
- **Stany:** na stanie, zarezerwowane i dostępne w każdej lokalizacji, z partiami i datami ważności.
- **Ruchy:** nowy ruch (przyjęcie PZ z numerem partii i datą ważności, wydanie WZ/RW, korekta stanu, przesunięcie MM między magazynami) i dziennik wszystkich ruchów z eksportem do CSV.
- **Daty ważności:** partie, którym kończy się termin.
- **Inwentaryzacja:** spis z natury dla lokalizacji; po zamknięciu spisu różnice zapisują się jako korekty.
- **Wartość:** wartość zapasu w cenach zakupu netto (tylko z dostępem do finansów).

Przy wysyłce zamówienia towar schodzi automatycznie z partii z najkrótszą datą ważności (FEFO). Przyjęty zwrot wraca na stan jako ruch „zwrot”.

### Zamówienia
Standardowy ekran Medusa: płatność, kompletacja, wysyłka, zwroty i reklamacje. Zamówienie z fakturą na firmę ma w danych nazwę firmy i NIP.

## 4. Treści sklepu

### Strona główna oraz Menu i stopka
1. Zmieniaj sekcje (kolejność strzałkami, dodawanie, edycja treści), potem **Zapisz szkic**.
2. **Podgląd** otwiera sklep z wersją roboczą pod jednorazowym adresem (niewidocznym dla wyszukiwarek).
3. **Opublikuj** wprowadza zmiany w sklepie; poprzedni adres podglądu przestaje działać.
4. **Odrzuć szkic** wraca do wersji opublikowanej. **Historia wersji → Przywróć do szkicu** pozwala wrócić do dowolnej wcześniejszej wersji.

Linki muszą prowadzić do stron sklepu (`/…`) lub adresów `https://`. Obrazy wymagają tekstu alternatywnego.

### Blog
Wpis ma tytuł, adres (slug), zajawkę, treść, opcjonalną okładkę z opisem i do 8 powiązanych produktów. Treść to zwykły tekst z prostym formatowaniem: `## ` i `### ` na początku linii to nagłówki, `- ` to punkt listy, `**tekst**` to pogrubienie, `[tekst](/adres)` to link; akapity rozdziela pusta linia. Po pierwszej publikacji adres wpisu jest zablokowany, żeby nie psuć linków. Wpis można wycofać do szkicu.

### Przekierowania
Przekierowanie stałe (301) lub tymczasowe (302) ze starego adresu na nowy, np. po zmianie adresu produktu. Tylko adresy w obrębie sklepu.

### Wyszukiwarka
Synonimy (np. „proszek” = „detergent”), podgląd wyników dla dowolnej frazy i statystyki: najczęstsze wyszukiwania oraz frazy bez wyników (podpowiedź, jakich produktów lub synonimów brakuje).

## 5. Integracje
Ekran **Integracje** pokazuje dostępne połączenia (płatności, dostawy, księgowość, marketplace), ich stan, logi i zdarzenia z możliwością ponowienia. Dane dostępowe są przechowywane zaszyfrowane i nie są wyświetlane po zapisaniu.
Domyślnie integracje działają wyłącznie w trybie testowym (sandbox). Tryb produkcyjny wymaga zgody właściciela i ustawienia `PATRIX_ALLOW_PRODUCTION_INTEGRATIONS=true` na serwerze.

## 6. Dobre praktyki
- Każdy pracownik ma własne konto: nie udostępniamy haseł ani kodów MFA.
- Nadajemy najwęższą rolę wystarczającą do pracy; po odejściu pracownika usuwamy jego konto lub rolę.
- Danych produktu (skład, alergeny, ostrzeżenia, daty) nie wpisujemy z pamięci ani ze stron innych sklepów.
- Przed większą zmianą strony głównej korzystamy z podglądu.
