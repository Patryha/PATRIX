import Form from "next/form"
import { SearchIcon } from "@/components/ui/icons"
import { cn } from "@/lib/cn"

/** Formularz wyszukiwania (działa bez JavaScriptu: GET /szukaj?q=…). */
export function SearchForm({ className, defaultValue, id = "search" }: { className?: string; defaultValue?: string; id?: string }) {
  return (
    <Form action="/szukaj" role="search" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Szukaj produktów
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Szukaj produktów, marek, EAN…"
        autoComplete="off"
        enterKeyHint="search"
        className="min-h-11 w-full rounded-full border border-border bg-surface pl-4 pr-12 text-base text-foreground placeholder:text-muted transition-colors focus:border-accent-strong focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:brightness-110"
      >
        <SearchIcon width={18} height={18} />
        <span className="sr-only">Szukaj</span>
      </button>
    </Form>
  )
}
