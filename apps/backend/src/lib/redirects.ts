/**
 * PATRIX: przekierowania 301/302 zarządzane w panelu. Tylko ścieżki wewnątrz sklepu (bez otwartych przekierowań),
 * bez łańcuchów i pętli: cel nie może być źródłem innego przekierowania i odwrotnie.
 */

const PATH = /^\/(?!\/)[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*$/

/** Ścieżka w postaci kanonicznej: bez końcowego ukośnika (poza „/”), bez części zapytania i kotwicy. */
export function normalizePath(input: string) {
  const path = input.trim().split(/[?#]/)[0]
  if (!PATH.test(path) || path.length > 500) {
    return null
  }
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path
}

export type RedirectRule = { id?: string; from_path: string; to_path: string }

/** Komunikat błędu albo null, gdy przekierowanie można zapisać obok istniejących. */
export function validateRedirect(rule: RedirectRule, existing: RedirectRule[]): string | null {
  if (rule.from_path === rule.to_path) {
    return "Adres docelowy musi być inny niż źródłowy."
  }
  if (["/admin", "/app"].some((p) => rule.from_path === p || rule.from_path.startsWith(`${p}/`))) {
    return "Nie można przekierować adresu panelu."
  }
  const others = existing.filter((r) => r.id !== rule.id)
  if (others.some((r) => r.from_path === rule.from_path)) {
    return "Dla tego adresu istnieje już przekierowanie."
  }
  if (others.some((r) => r.from_path === rule.to_path)) {
    return "Adres docelowy sam jest przekierowany. Wskaż od razu adres końcowy, żeby nie tworzyć łańcucha."
  }
  if (others.some((r) => r.to_path === rule.from_path)) {
    return "Na ten adres prowadzi inne przekierowanie. Zmień najpierw tamto, żeby wskazywało adres końcowy."
  }
  return null
}
