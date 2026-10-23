# Stan integracji

Żadna integracja zewnętrzna nie jest jeszcze podłączona. Nie deklarujemy działania integracji bez zweryfikowanego połączenia.

| Obszar | Integracja | Stan | Uwagi |
|---|---|---|---|
| Płatności | Ręczna/systemowa Medusy (`pp_system_default`) | Dostępna tylko do testów | Nie pobiera pieniędzy |
| Płatności | Przelewy24, PayU, Tpay, Stripe, BLIK, Apple/Google Pay, pobranie | TODO (Etap 6) | Wymagają kont sandbox właściciela; potwierdzenie płatności wyłącznie z podpisanego webhooka |
| Dostawy | Wysyłka ręczna Medusy (`manual_manual`) | Skonfigurowana strefa „Polska”, bez opcji i cen | Cennik od właściciela |
| Dostawy | InPost, DPD, DHL, GLS, ORLEN Paczka, Poczta Polska | TODO (Etap 6) | |
| Magazyn/księgowość | Base(linker), Subiekt, Comarch, Fakturownia, inFakt, ERP/WMS/POS | TODO (Etap 6) | Bez zakładania konkretnego POS przed potwierdzeniem kompatybilności |
| Marketplace | Allegro, Google Merchant Center, Meta Commerce | TODO (Etap 6/8) | |
| Pliki | S3-compatible (MinIO/R2/S3) | Skonfigurowane warunkowo (`S3_BUCKET`) | W dev pliki lokalne |

## Fundament gotowy w Etapie 1
- `src/lib/crypto.ts`: szyfrowanie sekretów integracji AES-256-GCM (`PATRIX_ENCRYPTION_KEY`).
- Uprawnienie `integration:*` w rolach; klucze API Medusy (`sk_…`) tylko dla `integration:write`.
