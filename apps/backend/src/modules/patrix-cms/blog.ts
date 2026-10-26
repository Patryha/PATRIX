/** Format treści wpisu (wspólny z rendererem w sklepie): linki tylko do ścieżek sklepu albo https. */
const LINK = /\[([^\]\n]*)\]\(([^)\s]*)\)/g
const ALLOWED_HREF = /^(\/(?![/\\])\S*|https:\/\/\S+)$/

export const BLOG_BODY_MAX = 50_000

/** Opisy błędów w treści wpisu (pusta lista = poprawna). */
export function blogBodyIssues(body: string): string[] {
  const issues: string[] = []
  for (const [, label, href] of body.matchAll(LINK)) {
    if (!label.trim()) {
      issues.push(`Link ${href || "(pusty)"} nie ma tekstu.`)
    } else if (!ALLOWED_HREF.test(href)) {
      issues.push(`Link „${label}”: dozwolona ścieżka sklepu (/...) lub adres https://.`)
    }
  }
  return issues
}

/** Uchwyt adresu wpisu z tytułu: małe litery bez polskich znaków, cyfry i myślniki. */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "")
}
