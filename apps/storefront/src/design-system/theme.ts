import { darkColors, lightColors, type ThemeColors } from "./tokens"

/** Nadpisania kolorów z panelu administratora (np. zmiana palety marki). */
export type ThemeOverrides = { light?: Partial<ThemeColors>; dark?: Partial<ThemeColors> }

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * Przyjmuje wyłącznie poprawne kolory HEX dla znanych kluczy. Chroni przed wstrzyknięciem CSS
 * z danych zapisanych w panelu (wartość trafia do znacznika <style>).
 */
export function sanitizeColors(input: unknown): Partial<ThemeColors> {
  if (!input || typeof input !== "object") {
    return {}
  }
  const result: Partial<ThemeColors> = {}
  for (const key of Object.keys(lightColors) as (keyof ThemeColors)[]) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value === "string" && HEX.test(value.trim())) {
      result[key] = value.trim()
    }
  }
  return result
}

function declarations(colors: ThemeColors): string {
  return Object.entries(colors)
    .map(([key, value]) => `--px-${key}:${value};`)
    .join("")
}

/**
 * Buduje CSS motywu: jasny domyślnie, ciemny gdy użytkownik wybrał go ręcznie (data-theme="dark")
 * albo ma ciemny motyw systemowy i nie wybrał jasnego.
 */
export function buildThemeCss(overrides: ThemeOverrides = {}): string {
  const light = { ...lightColors, ...sanitizeColors(overrides.light) }
  const dark = { ...darkColors, ...sanitizeColors(overrides.dark) }
  return [
    `:root{${declarations(light)}color-scheme:light;}`,
    `:root[data-theme="dark"]{${declarations(dark)}color-scheme:dark;}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${declarations(dark)}color-scheme:dark;}}`,
  ].join("\n")
}

export const THEME_STORAGE_KEY = "patrix-theme"

/** Skrypt uruchamiany przed pierwszym malowaniem: ustawia zapisany motyw, bez migotania. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})()`
