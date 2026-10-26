/**
 * Typy sekcji strony głównej. Źródłem prawdy jest schemat w backendzie (apps/backend/src/modules/patrix-cms/sections.ts):
 * tam dane są walidowane przy zapisie, sklep tylko je wyświetla.
 */
type Base = { id: string; enabled: boolean }

export type AnnouncementBar = Base & { type: "announcement_bar"; messages: { text: string; href?: string }[] }
export type HeroSlide = {
  eyebrow?: string
  title: string
  text?: string
  image_url?: string
  image_alt?: string
  cta_label?: string
  cta_href?: string
  theme: "brand" | "light"
}
export type HeroSlider = Base & { type: "hero_slider"; autoplay: boolean; slides: HeroSlide[] }
export type CategoryTiles = Base & { type: "category_tiles"; title: string; category_handles: string[] }
export type ProductSource = "newest" | "bestsellers" | "on_sale" | "category" | "products"
export type ProductRail = Base & {
  type: "product_rail"
  title: string
  source: ProductSource
  category_handle?: string
  product_handles?: string[]
  limit: number
  link_label?: string
  link_href?: string
}
export type RecentlyViewed = Base & { type: "recently_viewed"; title: string }
export type BrandStory = Base & {
  type: "brand_story"
  title: string
  text: string
  image_url?: string
  image_alt?: string
  cta_label?: string
  cta_href?: string
}
export type InfoIcon = "truck" | "shield" | "flag" | "card" | "return" | "box"
export type InfoTiles = Base & { type: "info_tiles"; title?: string; items: { icon: InfoIcon; title: string; text: string; href?: string }[] }

export type Section = AnnouncementBar | HeroSlider | CategoryTiles | ProductRail | RecentlyViewed | BrandStory | InfoTiles
export type PageContent = { sections: Section[] }

const KNOWN = new Set<Section["type"]>([
  "announcement_bar",
  "hero_slider",
  "category_tiles",
  "product_rail",
  "recently_viewed",
  "brand_story",
  "info_tiles",
])

/** Sekcje do wyświetlenia: włączone i znanego typu (starszy sklep pomija typy dodane później w panelu). */
export function visibleSections(content: PageContent | null | undefined): Section[] {
  return (content?.sections ?? []).filter((s) => s?.enabled !== false && KNOWN.has(s?.type))
}

/** Link wewnętrzny sklepu (renderowany przez next/link) czy zewnętrzny. */
export const isInternal = (href: string) => /^\/(?![/\\])/.test(href)
