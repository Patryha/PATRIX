import { buildThemeCss, themeInitScript, type ThemeOverrides } from "@/design-system/theme"

/** Zmienne motywu + skrypt ustawiający zapisany motyw przed pierwszym malowaniem. */
export function ThemeStyle({ overrides }: { overrides?: ThemeOverrides }) {
  return (
    <>
      <style id="patrix-theme" dangerouslySetInnerHTML={{ __html: buildThemeCss(overrides) }} />
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    </>
  )
}
