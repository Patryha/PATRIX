# MASTER PLAN: PATRIX E-COMMERCE

Cel: profesjonalny, bezpieczny i gotowy do wdrożenia sklep PATRIX z panelem administracyjnym, magazynem, centrum integracji i funkcjami AI. Szczegóły zakresu: master prompt właściciela (wątek projektu „Sklep PATRIX”).

## Etapy i zależności

| Etap | Zakres | Zależy od | Status |
|---|---|---|---|
| 0 | Audyt środowiska, wybór architektury, plan | — | DONE |
| 1 | Fundament: monorepo, TS, baza, autoryzacja i role, design system, testy, CI | 0 | DONE |
| 2 | Frontend sklepu: pełna strona główna (sekcje z CMS), mega menu, listing z filtrami i sortowaniem, karta produktu (dane prawne), responsywność, ostatnio oglądane | 1 | DONE |
| 3 | Commerce i checkout: koszyk (gość), konto klienta, adresy, faktura firmowa, dostawy, zamówienia, VAT 23/8/5%, zwroty i reklamacje, e-maile | 1, 2 | DONE poza e-mailami (E3-7, czeka na dostawcę) i zwrotami (E3-9) |
| 4 | Panel administratora: dashboard KPI, produkty (atrybuty kategorii, kompletność danych, import CSV/XLSX/API, masowe zmiany), CMS z wersjami i podglądem, promocje, zarządzanie rolami | 1 | DONE poza newsletterem (E4-5, czeka na dostawcę e-mail) |
| 5 | Magazyn: wiele magazynów i lokalizacji, przyjęcia, rozchody, korekty, rezerwacje, partie i daty ważności (FEFO), inwentaryzacja, raporty, gotowość pod POS | 1, 3 | DONE (POS jako API, D-030) |
| 6 | Integration Center: manifest adapterów, sejf sekretów, webhooki z podpisem, kolejki i idempotencja, logi i ponowienia; płatności (P24, PayU, Tpay, Stripe), dostawy (InPost, DPD, DHL, GLS, ORLEN, Poczta Polska), księgowość/ERP, marketplace | 3, 5 | W TOKU: fundament gotowy, adaptery czekają na konta sandbox (OWN-4) |
| 7 | Inteligentne funkcje: wyszukiwarka (literówki, PL/DE, synonimy, EAN; własny silnik zamiast Meilisearch, D-032), rekomendacje, wsparcie AI dla admina z akceptacją człowieka, chatbot na zweryfikowanej wiedzy | 2, 4 | W TOKU |
| 8 | Marketing i SEO: metadane, dane strukturalne, sitemap, 301, blog, newsletter (double opt-in), zgody (CMP), GA4/Meta za zgodą, Merchant Center | 2, 4 | W TOKU |
| 9 | Testy: pełne E2E zakupu, dostępność, wydajność (CWV), bezpieczeństwo (DAST), testy uprawnień | 2–8 | TODO |
| 10 | Wdrożenie: staging, konfiguracja produkcyjna, dokumentacja admina i integracji, checklista startu | 9 | TODO |

## Kryteria ukończenia projektu
Zgodne z sekcją 21 master promptu (m.in. działający checkout w środowisku testowym, zweryfikowane płatności testowe, testowe scenariusze dostaw, zielone E2E, dokumentacja i checklista uruchomienia).

## Role (agenci) i odpowiedzialności
Prace wykonywane sekwencyjnie w jednej sesji, w podziale na role z master promptu (PM, UX/UI, Frontend, Backend, Integracje, Magazyn, Security & Compliance, QA, DevOps, SEO). Każda rola dokumentuje wynik i kryteria odbioru w `TASKS.md` oraz `TEST_REPORT.md`.
