# Wzorzec funkcjonalny: notatki (inspiracja, bez kopiowania)

Notatki opisują **typowe funkcje** dużych drogerii internetowych (w tym Rossmann.pl) jako punkt odniesienia dla zakresu PATRIX. Nie kopiujemy kodu, tekstów, grafik ani identyfikacji wizualnej. Notatki sporządzone z wiedzy ogólnej; przed Etapem 2 do zweryfikowania na publicznej stronie.

| Obszar | Wzorzec rynkowy | Decyzja dla PATRIX |
|---|---|---|
| Nawigacja | Mega menu z kategoriami i podkategoriami, skróty do promocji i nowości | Menu kategorii z backendu (Etap 1), mega menu z grafikami (Etap 2) |
| Karta produktu | Galeria, warianty, cena jednostkowa, najniższa cena z 30 dni, skład, opinie, produkty powiązane | Etap 2 + moduł danych prawnych |
| Promocje | Etykiety promocji, „druga sztuka taniej”, ceny dla klubu | Etap 4/12, bez manipulacyjnych liczników |
| Wyszukiwarka | Podpowiedzi, popularne frazy, tolerancja literówek | Etap 7 (Meilisearch) |
| Filtry | Marka, cena, cechy produktu, dostępność | Etap 2 (atrybuty per kategoria) |
| Koszyk/checkout | Zakup bez rejestracji, punkty odbioru, wiele metod płatności | Etap 3/6 |
| Konto | Historia zamówień, adresy, ulubione | Etap 3 |
| Lojalność | Program punktowy, oferty personalne | Etap 12 (za zgodą klienta) |
| Rekomendacje | „Kupowane razem”, „Może Ci się spodobać” | Etap 7 |
| Mobile | Sticky header, sticky koszyk, szybkie filtry | Sticky header (Etap 1), sticky koszyk (Etap 3) |
