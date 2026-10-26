"use client"

import Image from "next/image"
import Form from "next/form"
import { useRouter } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { SearchIcon } from "@/components/ui/icons"
import { getSearchSuggestions } from "@/lib/actions/search"
import { cn } from "@/lib/cn"
import type { SuggestResponse } from "@/lib/data/search"

type Option = { key: string; href: string; label: string; kind: string; detail?: string | null; thumbnail?: string | null }

const DEBOUNCE_MS = 200

function toOptions(data: SuggestResponse | null): Option[] {
  if (!data) {
    return []
  }
  return [
    ...data.categories.map((c) => ({ key: `c-${c.handle}`, href: `/kategoria/${c.handle}`, label: c.name, kind: "Kategoria" })),
    ...data.brands.map((b) => ({ key: `b-${b.handle}`, href: `/marka/${b.handle}`, label: b.name, kind: "Marka" })),
    ...data.products.map((p) => ({ key: `p-${p.id}`, href: `/produkt/${p.handle}`, label: p.title, kind: "Produkt", detail: p.brand, thumbnail: p.thumbnail })),
  ]
}

/**
 * Formularz wyszukiwania z podpowiedziami (wzorzec combobox WAI-ARIA: strzałki, Enter, Escape).
 * Bez JavaScriptu działa jak zwykły formularz GET /szukaj?q=…
 */
export function SearchForm({ className, defaultValue, id = "search" }: { className?: string; defaultValue?: string; id?: string }) {
  const router = useRouter()
  const listId = `${useId()}-podpowiedzi`
  const [value, setValue] = useState(defaultValue ?? "")
  const [data, setData] = useState<{ q: string; result: SuggestResponse } | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const phrase = value.trim()
  useEffect(() => {
    if (phrase.length < 2) {
      return
    }
    let current = true
    const timer = setTimeout(() => {
      getSearchSuggestions(phrase).then((result) => current && setData({ q: phrase, result }))
    }, DEBOUNCE_MS)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [phrase])

  const options = phrase.length >= 2 && data?.q === phrase ? toOptions(data.result) : []
  const expanded = open && options.length > 0
  const optionId = (i: number) => `${listId}-${i}`

  return (
    <Form action="/szukaj" role="search" className={cn("relative w-full", className)} onSubmit={() => setOpen(false)}>
      <label htmlFor={id} className="sr-only">
        Szukaj produktów
      </label>
      <input
        id={id}
        name="q"
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && options.length) {
            e.preventDefault()
            setOpen(true)
            setActive((i) => (i + 1) % options.length)
          } else if (e.key === "ArrowUp" && options.length) {
            e.preventDefault()
            setActive((i) => (i <= 0 ? options.length - 1 : i - 1))
          } else if (e.key === "Escape" && expanded) {
            // pierwsze Escape zamyka podpowiedzi; dopiero kolejne czyści pole (domyślne zachowanie przeglądarki)
            e.preventDefault()
            setOpen(false)
            setActive(-1)
          } else if (e.key === "Enter" && expanded && active >= 0) {
            e.preventDefault()
            setOpen(false)
            router.push(options[active].href)
          }
        }}
        placeholder="Szukaj produktów, marek, EAN…"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        className="min-h-11 w-full rounded-full border border-border bg-surface pl-4 pr-12 text-base text-foreground placeholder:text-muted transition-colors focus:border-accent-strong focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:brightness-110"
      >
        <SearchIcon width={18} height={18} />
        <span className="sr-only">Szukaj</span>
      </button>
      <ul
        id={listId}
        role="listbox"
        aria-label="Podpowiedzi wyszukiwania"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
      >
        {options.map((option, i) => (
          <li
            key={option.key}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            // mousedown zamiast click: pole traci fokus (blur) dopiero po wyborze
            onMouseDown={(e) => {
              e.preventDefault()
              setOpen(false)
              router.push(option.href)
            }}
            onMouseEnter={() => setActive(i)}
            className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-1.5", i === active && "bg-background")}
          >
            {option.thumbnail ? (
              <Image src={option.thumbnail} alt="" width={36} height={36} className="size-9 shrink-0 rounded object-contain" />
            ) : (
              <span aria-hidden className="size-9 shrink-0" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted">{option.detail ? `${option.kind} · ${option.detail}` : option.kind}</span>
            </span>
          </li>
        ))}
      </ul>
    </Form>
  )
}
