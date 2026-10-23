"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { ChevronRightIcon, CloseIcon, MenuIcon } from "@/components/ui/icons"
import type { Category } from "@/lib/data/categories"
import { cn } from "@/lib/cn"

/**
 * Menu kategorii: na komputerze rozwijany panel (mega menu), na telefonie panel boczny.
 * Wzorzec "disclosure": przycisk z aria-expanded, Escape zamyka i oddaje fokus przyciskowi.
 */
export function CategoryMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Zamknięcie po nawigacji.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClick)
    panelRef.current?.querySelector<HTMLElement>("a")?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold text-foreground transition-colors hover:bg-surface-muted"
      >
        {open ? <CloseIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
        <span>Kategorie</span>
      </button>
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className={cn(
          "fixed inset-x-0 top-[var(--header-height,120px)] bottom-0 z-50 overflow-y-auto border-t border-border bg-surface shadow-xl",
          "md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-2 md:w-[min(90vw,960px)] md:rounded-lg md:border"
        )}
      >
        <nav aria-label="Kategorie produktów" className="p-4 md:p-6">
          {categories.length === 0 ? (
            <p className="text-muted">Kategorie są chwilowo niedostępne.</p>
          ) : (
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 md:grid-cols-3">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/kategoria/${category.handle}`}
                    className="group flex min-h-11 items-center justify-between rounded-md px-3 font-medium text-foreground transition-colors hover:bg-surface-muted hover:text-accent-strong"
                  >
                    {category.name}
                    <ChevronRightIcon width={18} height={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  {category.category_children?.length ? (
                    <ul className="mb-2 ml-3 border-l border-border pl-3">
                      {category.category_children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/kategoria/${child.handle}`}
                            className="flex min-h-9 items-center text-sm text-muted transition-colors hover:text-accent-strong"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>
    </div>
  )
}
