# PATRIX: instrukcje dla agentów

Sklep internetowy PATRIX („Niemiecka jakość na co dzień”): oryginalne produkty z Niemiec, rynek PL, PLN, język polski.

## Zasady stałe
- Z właścicielem komunikujemy się po polsku. Nie zadajemy zbędnych pytań; drobne decyzje techniczne podejmujemy sami i zapisujemy w `DECISIONS.md`.
- **Bez zgody właściciela nie wolno:** dokonywać realnych płatności, zamawiać płatnych usług/licencji, publikować sklepu produkcyjnie, wysyłać wiadomości do klientów, uruchamiać realnych transakcji.
- **Nie wymyślamy danych:** danych firmy, NIP, cen produktów, składów, ostrzeżeń, dat ważności, informacji prawnych. Brak danych = szkic + oznaczenie do weryfikacji.
- Żadnych atrap: każdy przycisk i link musi działać albo go nie ma.
- Nie używamy materiałów Medusa Enterprise Edition (RBAC, SSO/OIDC, `definePolicies`, `policies:` w middleware, flagi `MEDUSA_FF_RBAC*`). Patrz `DECISIONS.md` D-004.
- Nie kopiujemy kodu, tekstów ani identyfikacji wizualnej konkurencji (Rossmann to tylko inspiracja funkcjonalna).

## Struktura
- `apps/backend` — Medusa v2 (commerce, panel `/app`, moduły PATRIX w `src/modules`, API w `src/api`).
- `apps/storefront` — Next.js 16 (App Router, Cache Components), Tailwind 4, design system w `src/design-system`.
- `infra/` — Docker Compose, Caddy. `.github/` — CI i Dependabot.
- Dokumenty: `MASTER_PLAN.md`, `TASKS.md`, `PROGRESS.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TEST_REPORT.md`, `INTEGRATIONS.md`, `DEPLOYMENT.md`, `SECURITY.md`.

## Pętla pracy (obowiązkowa po każdej zmianie)
1. `npm run lint` (storefront), `npm run typecheck` (oba).
2. Testy: backend `npm run test:unit`, `npm run test:integration:http`; storefront `npm test`, `npm run build`, `npm run test:e2e`.
3. Napraw, uruchom ponownie, zaktualizuj `TEST_REPORT.md`, `TASKS.md`, `PROGRESS.md`.
4. Commit po etapie. Zadanie bez zielonych testów nie jest DONE.

## Uruchomienie lokalne
Patrz `DEPLOYMENT.md` → „Środowisko deweloperskie”. W kontenerze bez Dockera: Postgres 16 i Redis uruchamiane lokalnie (initdb jako użytkownik nie-root).

## Wznawianie pracy
Przeczytaj `TASKS.md` i `PROGRESS.md`, sprawdź `git log` i rzeczywisty stan testów. Dokumentacja nie jest dowodem ukończenia.
