/**
 * PATRIX: silnik wyszukiwania produktów w pamięci (D-032). Bez zależności od Medusy, więc w pełni testowalny.
 * Obsługuje: polskie i niemieckie znaki (ą→a, ß→ss, ü→u), literówki (odległość edycyjna 1–2), początek słowa
 * w trakcie pisania, części słów złożonych („mittel” w „Waschmittel”), synonimy i dokładne kody EAN/SKU.
 */

export type SearchField = { text: string | null | undefined; weight: number }

export type SearchDocInput = {
  id: string
  fields: SearchField[]
  codes: (string | null | undefined)[]
}

type IndexedDoc = { id: string; tokens: Map<string, number>; title: string; titleWords: number; codes: Set<string> }

export type SearchIndex = {
  docs: IndexedDoc[]
  /** Słowo → liczba dokumentów, w których występuje (do podpowiedzi „Czy chodziło Ci o…”). */
  vocabulary: Map<string, number>
  /** Fraza (znormalizowana) → wszystkie określenia z jej grup synonimów (jako listy słów). */
  synonyms: Map<string, string[][]>
}

export type SearchResult = {
  hits: { id: string; score: number }[]
  /** Wyniki pasują tylko do części frazy (żaden produkt nie pasował do całości). */
  partial: boolean
  /** Poprawiona fraza, gdy część słów nie występuje w katalogu. */
  suggestion: string | null
}

/** Słowa pomijane, jeśli fraza ma też inne słowa („płyn do naczyń” = „płyn naczyń”). */
const STOP_WORDS = new Set(["a", "i", "w", "z", "o", "u", "na", "do", "dla", "od", "po", "ze", "we", "und", "der", "die", "das", "fur", "mit"])

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export const tokenize = (text: string | null | undefined) => (text ? normalize(text).split(" ").filter(Boolean) : [])

/** Kod produktu do porównań (bez spacji i myślników, wielkość liter bez znaczenia). */
export const normalizeCode = (code: string) => code.toLowerCase().replace(/[\s-]+/g, "")

export function buildSearchIndex(inputs: SearchDocInput[], synonymGroups: string[][] = []): SearchIndex {
  const vocabulary = new Map<string, number>()
  const docs = inputs.map((input) => {
    const tokens = new Map<string, number>()
    for (const field of input.fields) {
      for (const token of tokenize(field.text)) {
        tokens.set(token, Math.max(tokens.get(token) ?? 0, field.weight))
      }
    }
    for (const token of tokens.keys()) {
      vocabulary.set(token, (vocabulary.get(token) ?? 0) + 1)
    }
    const titleTokens = meaningfulTokens(input.fields[0]?.text ?? "", 50)
    const codes = new Set(input.codes.flatMap((c) => (c && c.trim() ? [normalizeCode(c)] : [])))
    return { id: input.id, tokens, title: titleTokens.join(" "), titleWords: titleTokens.length, codes }
  })

  const synonyms = new Map<string, string[][]>()
  for (const group of synonymGroups) {
    const terms = group.map((term) => meaningfulTokens(term)).filter((t) => t.length)
    for (const term of terms) {
      const key = term.join(" ")
      const known = synonyms.get(key) ?? [term]
      for (const other of terms) {
        if (!known.some((k) => k.join(" ") === other.join(" "))) {
          known.push(other)
        }
      }
      synonyms.set(key, known)
    }
  }
  return { docs, vocabulary, synonyms }
}

/** Odległość Damerau–Levenshtein (wariant OSA) z przerwaniem po przekroczeniu `max`. */
export function editDistance(a: string, b: string, max = Number.POSITIVE_INFINITY) {
  if (Math.abs(a.length - b.length) > max) {
    return max + 1
  }
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prev2[j - 2] + 1)
      }
      row.push(value)
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) {
      return max + 1
    }
    prev2 = prev
    prev = row
  }
  return prev[b.length]
}

const allowedEdits = (word: string) => (/\d/.test(word) ? 0 : word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0)

/** Jak dobrze słowo z frazy pasuje do słowa z katalogu (0–1). */
function wordScore(query: string, word: string, isPrefix: boolean) {
  if (query === word) {
    return 1
  }
  if (word.startsWith(query) && query.length >= (isPrefix ? 2 : 3)) {
    return 0.85
  }
  if (/\d/.test(query)) {
    return 0
  }
  if (query.length >= 4 && word.length > query.length && word.includes(query)) {
    return 0.6
  }
  const max = allowedEdits(query)
  if (max && Math.abs(word.length - query.length) <= max) {
    const distance = editDistance(query, word, max)
    if (distance <= max) {
      return distance === 1 ? 0.7 : 0.5
    }
  }
  return 0
}

type Slot = { alternatives: string[][]; text: string }

/** Podział frazy na „sloty”: pojedyncze słowa albo frazy z grup synonimów (najdłuższe dopasowanie wygrywa). */
function slotsFor(tokens: string[], synonyms: Map<string, string[][]>): Slot[] {
  const slots: Slot[] = []
  let i = 0
  while (i < tokens.length) {
    let matched = 0
    for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
      const key = tokens.slice(i, i + len).join(" ")
      const group = synonyms.get(key)
      if (group) {
        slots.push({ alternatives: group, text: key })
        matched = len
        break
      }
    }
    if (!matched) {
      slots.push({ alternatives: [[tokens[i]]], text: tokens[i] })
      matched = 1
    }
    i += matched
  }
  return slots
}

function meaningfulTokens(text: string, max = 8) {
  const tokens = tokenize(text).filter((t) => t.length > 1 || /\d/.test(t))
  const content = tokens.filter((t) => !STOP_WORDS.has(t))
  return (content.length ? content : tokens).slice(0, max)
}

export function search(index: SearchIndex, query: string, options: { limit?: number; allowedIds?: Set<string> } = {}): SearchResult {
  const limit = options.limit ?? 500
  const docs = options.allowedIds ? index.docs.filter((d) => options.allowedIds!.has(d.id)) : index.docs

  const code = normalizeCode(query.trim())
  if (code.length >= 3) {
    const byCode = docs.filter((d) => d.codes.has(code))
    if (byCode.length) {
      return { hits: byCode.slice(0, limit).map((d) => ({ id: d.id, score: 1000 })), partial: false, suggestion: null }
    }
  }

  const tokens = meaningfulTokens(query)
  if (!tokens.length) {
    return { hits: [], partial: false, suggestion: null }
  }
  const slots = slotsFor(tokens, index.synonyms)
  const lastWord = tokens[tokens.length - 1]

  // Dla każdego słowa frazy liczymy dopasowania do słownika tylko raz, a nie dla każdego produktu osobno.
  const wordMatches = new Map<string, Map<string, number>>()
  for (const slot of slots) {
    for (const alternative of slot.alternatives) {
      for (const word of alternative) {
        if (wordMatches.has(word)) {
          continue
        }
        const matches = new Map<string, number>()
        for (const vocabWord of index.vocabulary.keys()) {
          const score = wordScore(word, vocabWord, word === lastWord)
          if (score > 0) {
            matches.set(vocabWord, score)
          }
        }
        wordMatches.set(word, matches)
      }
    }
  }

  const phrase = tokens.join(" ")
  const scored = docs.map((doc) => {
    let total = 0
    let matchedSlots = 0
    for (const slot of slots) {
      let best = 0
      for (const alternative of slot.alternatives) {
        let sum = 0
        let all = true
        for (const word of alternative) {
          let wordBest = 0
          for (const [vocabWord, score] of wordMatches.get(word)!) {
            const weight = doc.tokens.get(vocabWord)
            if (weight !== undefined) {
              wordBest = Math.max(wordBest, score * weight)
            }
          }
          if (!wordBest) {
            all = false
            break
          }
          sum += wordBest
        }
        if (all) {
          best = Math.max(best, sum / alternative.length)
        }
      }
      if (best > 0) {
        matchedSlots += 1
        total += best
      }
    }
    if (matchedSlots && doc.title.includes(phrase)) {
      total += 2
    }
    return { id: doc.id, score: total, matchedSlots, titleWords: doc.titleWords }
  })

  // Przy równej trafności wygrywa krótsza nazwa (bardziej konkretny produkt, np. krem przed zestawem kremów).
  const byScore = (a: { score: number; titleWords: number }, b: { score: number; titleWords: number }) => b.score - a.score || a.titleWords - b.titleWords
  const full = scored.filter((s) => s.matchedSlots === slots.length).sort(byScore)
  let partial = false
  let hits = full
  if (!full.length && slots.length > 1) {
    const needed = Math.ceil(slots.length / 2)
    hits = scored.filter((s) => s.matchedSlots >= needed).sort((a, b) => b.matchedSlots - a.matchedSlots || byScore(a, b))
    partial = hits.length > 0
  }

  return {
    hits: hits.slice(0, limit).map(({ id, score }) => ({ id, score: Math.round(score * 1000) / 1000 })),
    partial,
    suggestion: full.length ? null : suggestCorrection(index, tokens, wordMatches),
  }
}

/** Poprawka frazy: słowa bez żadnego dopasowania zastępujemy najbliższym słowem z katalogu (do 3 zmian). */
function suggestCorrection(index: SearchIndex, tokens: string[], wordMatches: Map<string, Map<string, number>>) {
  let changed = false
  const corrected = tokens.map((token) => {
    if (wordMatches.get(token)?.size || /\d/.test(token) || token.length < 4 || index.synonyms.has(token)) {
      return token
    }
    const max = token.length >= 7 ? 3 : 2
    let best: { word: string; distance: number; frequency: number } | null = null
    for (const [word, frequency] of index.vocabulary) {
      const distance = editDistance(token, word, max)
      if (distance <= max && (!best || distance < best.distance || (distance === best.distance && frequency > best.frequency))) {
        best = { word, distance, frequency }
      }
    }
    if (best) {
      changed = true
      return best.word
    }
    return token
  })
  return changed ? corrected.join(" ") : null
}
