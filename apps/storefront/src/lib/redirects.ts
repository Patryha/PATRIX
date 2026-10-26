export type RedirectTarget = { to: string; permanent: boolean }

/** Ścieżka do porównania z przekierowaniami: bez końcowego ukośnika (poza „/”). */
export function normalizeRequestPath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname
}

/** Cel przekierowania tylko w obrębie sklepu (ochrona przed otwartym przekierowaniem, gdyby lista była błędna). */
export function safeTarget(to: string) {
  return to.startsWith("/") && !to.startsWith("//") && !to.includes("\\") ? to : null
}

export function buildRedirectMap(list: { from: string; to: string; permanent: boolean }[]) {
  const map = new Map<string, RedirectTarget>()
  for (const r of list) {
    const to = safeTarget(r.to)
    if (to) {
      map.set(normalizeRequestPath(r.from), { to, permanent: r.permanent })
    }
  }
  return map
}
