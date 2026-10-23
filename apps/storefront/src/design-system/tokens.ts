/**
 * PATRIX Design System: tokeny bazowe.
 * Kolory marki pochodzą z założeń właściciela. Warianty "strong" są dobrane tak,
 * by tekst i przyciski spełniały WCAG 2.2 AA (kontrast ≥ 4.5:1) na jasnym tle.
 */
export const brand = {
  navy: "#10283F",
  teal: "#00A99D",
  warmWhite: "#FAFAF7",
  orange: "#FF8A3D",
  graphite: "#263238",
} as const

/** Kolory semantyczne motywu. Każdy klucz staje się zmienną CSS --px-<klucz> (mapowaną na klasy Tailwind w globals.css). */
export type ThemeColors = {
  background: string
  surface: string
  "surface-muted": string
  foreground: string
  muted: string
  border: string
  primary: string
  "primary-foreground": string
  accent: string
  "accent-strong": string
  "accent-foreground": string
  highlight: string
  "highlight-strong": string
  "highlight-foreground": string
  success: string
  warning: string
  danger: string
  focus: string
  /** Sekcje wyróżnione marką (hero, banery): zawsze granatowe tło. */
  hero: string
  "hero-foreground": string
  "hero-accent": string
}

export const lightColors: ThemeColors = {
  background: brand.warmWhite,
  surface: "#FFFFFF",
  "surface-muted": "#F1F2EE",
  foreground: brand.graphite,
  muted: "#5B6B76", // 5.27:1 na warm white
  border: "#DCDFDA",
  primary: brand.navy, // przyciski główne: biały tekst 15:1
  "primary-foreground": "#FFFFFF",
  accent: brand.teal, // elementy dekoracyjne, duże powierzchnie
  "accent-strong": "#007D74", // tekst i linki w kolorze teal: 4.8:1
  "accent-foreground": "#FFFFFF",
  highlight: brand.orange, // tło promocji z tekstem navy: 6.4:1
  "highlight-strong": "#A84A0C", // tekst promocyjny na jasnym tle: 5.5:1
  "highlight-foreground": brand.navy,
  success: "#1E7A46",
  warning: "#8A5A00",
  danger: "#B42318",
  focus: "#007D74",
  hero: brand.navy,
  "hero-foreground": "#FFFFFF",
  "hero-accent": brand.teal, // 5.1:1 na granacie
}

export const darkColors: ThemeColors = {
  background: "#0B1A29",
  surface: "#10283F",
  "surface-muted": "#163450",
  foreground: "#E8EEF2",
  muted: "#9FB0BF",
  border: "#25445F",
  primary: brand.teal,
  "primary-foreground": "#07131F",
  accent: brand.teal,
  "accent-strong": "#3CCFC3",
  "accent-foreground": "#07131F",
  highlight: brand.orange,
  "highlight-strong": "#FFA56B",
  "highlight-foreground": "#07131F",
  success: "#4CC38A",
  warning: "#F5B84A",
  danger: "#FF7A70",
  focus: "#3CCFC3",
  hero: brand.navy,
  "hero-foreground": "#E8EEF2",
  "hero-accent": "#3CCFC3",
}

export const radii = { sm: "6px", md: "10px", lg: "16px", xl: "24px", pill: "999px" } as const

export const typography = {
  fontSans: "var(--font-inter)",
  fontDisplay: "var(--font-manrope)",
  // Skala modularna 1.2, bazowo 16 px (czytelność na telefonie).
  scale: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem", "5xl": "3rem" },
} as const

export const motion = {
  fast: "120ms",
  base: "200ms",
  slow: "320ms",
  easing: "cubic-bezier(0.2, 0, 0, 1)",
} as const

export const layout = { containerMax: "1280px", gutter: "1rem", gutterDesktop: "2rem", headerHeight: "64px" } as const
