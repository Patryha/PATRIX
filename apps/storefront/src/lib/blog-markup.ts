/**
 * Prosty format treści wpisów bloga (ten sam, który waliduje backend): bloki rozdziela pusta linia,
 * „## ”/„### ” to nagłówki, linie „- ” to lista, w tekście **pogrubienie** i [tekst](adres).
 * Wynik to drzewo danych renderowane przez React, więc żaden HTML z bazy nie trafia na stronę.
 */

export type Inline = { type: "text"; text: string } | { type: "strong"; text: string } | { type: "link"; text: string; href: string }

export type Block =
  | { type: "heading"; level: 2 | 3; content: Inline[] }
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "list"; items: Inline[][] }

const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g
const SAFE_HREF = /^(\/(?![/\\])\S*|https:\/\/\S+)$/

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0
    if (index > last) {
      out.push({ type: "text", text: text.slice(last, index) })
    }
    if (match[1] !== undefined) {
      out.push({ type: "strong", text: match[1] })
    } else if (SAFE_HREF.test(match[3])) {
      out.push({ type: "link", text: match[2], href: match[3] })
    } else {
      // Niedozwolony adres (backend go odrzuca, to druga linia obrony): sam tekst linku.
      out.push({ type: "text", text: match[2] })
    }
    last = index + match[0].length
  }
  if (last < text.length) {
    out.push({ type: "text", text: text.slice(last) })
  }
  return out
}

export function parseBlogBody(body: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of body.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean)
    let paragraph: Inline[][] = []
    let list: Inline[][] = []
    const flush = () => {
      if (paragraph.length) {
        blocks.push({ type: "paragraph", lines: paragraph })
        paragraph = []
      }
      if (list.length) {
        blocks.push({ type: "list", items: list })
        list = []
      }
    }
    for (const line of lines) {
      const heading = /^(#{2,3})\s+(.+)$/.exec(line)
      if (heading) {
        flush()
        blocks.push({ type: "heading", level: heading[1].length as 2 | 3, content: parseInline(heading[2]) })
      } else if (/^-\s+/.test(line)) {
        if (paragraph.length) {
          flush()
        }
        list.push(parseInline(line.replace(/^-\s+/, "")))
      } else {
        if (list.length) {
          flush()
        }
        paragraph.push(parseInline(line))
      }
    }
    flush()
  }
  return blocks
}

/** Czas czytania w minutach (ok. 200 słów na minutę), co najmniej 1. */
export function readingMinutes(body: string) {
  const words = body.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  return Math.max(1, Math.round(words / 200))
}
