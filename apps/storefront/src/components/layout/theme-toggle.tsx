"use client"

import { useSyncExternalStore } from "react"
import { MoonIcon, SunIcon } from "@/components/ui/icons"
import { THEME_STORAGE_KEY } from "@/design-system/theme"

type Theme = "light" | "dark"

function currentTheme(): Theme {
  const explicit = document.documentElement.dataset.theme
  if (explicit === "light" || explicit === "dark") {
    return explicit
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const listeners = new Set<() => void>()
function subscribe(callback: () => void) {
  listeners.add(callback)
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  media.addEventListener("change", callback)
  return () => {
    listeners.delete(callback)
    media.removeEventListener("change", callback)
  }
}

/** Przełącznik motywu jasny/ciemny. Wybór zapisujemy lokalnie (preferencja, nie dane osobowe). */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null)
  const next: Theme = theme === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next)
        } catch {
          // Tryb prywatny: motyw działa do końca sesji.
        }
        listeners.forEach((l) => l())
      }}
      className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-muted"
      aria-label={next === "dark" ? "Włącz tryb ciemny" : "Włącz tryb jasny"}
      title={next === "dark" ? "Tryb ciemny" : "Tryb jasny"}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
