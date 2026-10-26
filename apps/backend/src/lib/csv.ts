/**
 * Parser CSV (RFC 4180) dla importu z panelu: cudzysłowy, nowe linie w polach, BOM, CRLF.
 * Separator wykrywany z wiersza nagłówka: „;” (polski Excel), „,” albo tabulator.
 * Nagłówki normalizujemy: małe litery, bez polskich znaków, spacje → „_”.
 */
export type CsvTable = { headers: string[]; rows: Record<string, string>[] }

export const MAX_CSV_ROWS = 2000

export function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function detectDelimiter(text: string) {
  const firstLine = text.slice(0, text.search(/\r?\n|$/))
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length] as const)
  return counts.sort((a, b) => b[1] - a[1])[0][0]
}

function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"' && field === "") {
      quoted = true
    } else if (ch === delimiter) {
      record.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") {
        i++
      }
      record.push(field)
      records.push(record)
      record = []
      field = ""
    } else {
      field += ch
    }
  }
  if (quoted) {
    throw new Error("Niezamknięty cudzysłów w pliku CSV.")
  }
  if (field !== "" || record.length) {
    record.push(field)
    records.push(record)
  }
  return records.filter((r) => r.some((v) => v.trim() !== ""))
}

export function parseCsv(input: string): CsvTable {
  const text = input.replace(/^﻿/, "")
  const [header, ...body] = splitRecords(text, detectDelimiter(text))
  if (!header) {
    throw new Error("Plik CSV jest pusty.")
  }
  if (body.length > MAX_CSV_ROWS) {
    throw new Error(`Za dużo wierszy (${body.length}). Maksymalnie ${MAX_CSV_ROWS} w jednym pliku.`)
  }
  const headers = header.map(normalizeHeader)
  const duplicate = headers.find((h, i) => h && headers.indexOf(h) !== i)
  if (duplicate) {
    throw new Error(`Powtórzona kolumna: ${duplicate}`)
  }
  const rows = body.map((values) => Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()])))
  return { headers, rows }
}

/** Liczba z polskim lub angielskim separatorem dziesiętnym („12,50”, „12.50”, „1 234,5”). */
export function parseDecimal(value: string): number | null {
  const cleaned = value.replace(/[\s ]/g, "").replace(",", ".")
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : null
}

export function parseYesNo(value: string): boolean | null {
  const v = normalizeHeader(value)
  if (["tak", "t", "yes", "y", "1", "true"].includes(v)) {
    return true
  }
  if (["nie", "n", "no", "0", "false"].includes(v)) {
    return false
  }
  return null
}

type CsvCell = string | number | null | undefined

/** Komórka tekstowa zaczynająca się od = + - @ (lub tabulatora) jest w Excelu formułą: poprzedzamy ją apostrofem. */
function csvCell(value: CsvCell, delimiter: string) {
  if (value === null || value === undefined) {
    return ""
  }
  let text = typeof value === "number" ? String(value).replace(".", ",") : value
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }
  return /["\r\n]/.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV dla polskiego Excela: BOM, średnik, CRLF, przecinek dziesiętny. */
export function toCsv(header: string[], rows: CsvCell[][], delimiter = ";") {
  return "﻿" + [header, ...rows].map((row) => row.map((c) => csvCell(c, delimiter)).join(delimiter)).join("\r\n") + "\r\n"
}
