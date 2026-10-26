import { z } from "@medusajs/framework/zod"

/**
 * Sekcje strony głównej edytowane w panelu. Schemat jest jedynym źródłem prawdy o tym, co może zostać zapisane:
 * sklep renderuje tylko znane typy, a dane spoza schematu są odrzucane przy zapisie.
 */

/** Link wewnętrzny sklepu ("/kategoria/...") albo zewnętrzny https. */
const href = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^\/(?![/\\])/.test(v) || /^https:\/\/[^\s]+$/.test(v), "Link: ścieżka sklepu (/...) lub adres https://")
/** Obraz z magazynu plików (https) albo z katalogu publicznego sklepu ("/..."). */
const imageUrl = href
const text = (max: number) => z.string().trim().min(1, "Pole wymagane").max(max)
const optionalText = (max: number) => z.string().trim().max(max).optional()
const handle = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Uchwyt: małe litery, cyfry i myślniki")

const base = {
  id: z.string().regex(/^[a-zA-Z0-9_-]{4,40}$/),
  enabled: z.boolean().default(true),
}

export const AnnouncementBarSection = z.object({
  ...base,
  type: z.literal("announcement_bar"),
  messages: z.array(z.object({ text: text(140), href: href.optional() })).min(1).max(5),
})

export const HeroSliderSection = z.object({
  ...base,
  type: z.literal("hero_slider"),
  autoplay: z.boolean().default(false),
  slides: z
    .array(
      z
        .object({
          eyebrow: optionalText(80),
          title: text(120),
          text: optionalText(300),
          image_url: imageUrl.optional(),
          image_alt: optionalText(200),
          cta_label: optionalText(40),
          cta_href: href.optional(),
          theme: z.enum(["brand", "light"]).default("brand"),
        })
        .refine((s) => !s.cta_label === !s.cta_href, { message: "Przycisk wymaga etykiety i linku", path: ["cta_href"] })
        .refine((s) => !s.image_url || !!s.image_alt, { message: "Obraz wymaga tekstu alternatywnego", path: ["image_alt"] })
    )
    .min(1)
    .max(6),
})

export const CategoryTilesSection = z.object({
  ...base,
  type: z.literal("category_tiles"),
  title: text(80),
  /** Puste: wszystkie kategorie główne w kolejności z panelu. */
  category_handles: z.array(handle).max(24).default([]),
})

export const PRODUCT_SOURCES = ["newest", "bestsellers", "on_sale", "category", "products"] as const

export const ProductRailSection = z.object({
    ...base,
    type: z.literal("product_rail"),
    title: text(80),
    source: z.enum(PRODUCT_SOURCES),
    category_handle: handle.optional(),
    product_handles: z.array(handle).max(24).optional(),
    limit: z.number().int().min(2).max(24).default(8),
    link_label: optionalText(40),
    link_href: href.optional(),
})

export const RecentlyViewedSection = z.object({
  ...base,
  type: z.literal("recently_viewed"),
  title: text(80),
})

export const BrandStorySection = z.object({
  ...base,
  type: z.literal("brand_story"),
  title: text(120),
  text: text(2000),
  image_url: imageUrl.optional(),
  image_alt: optionalText(200),
  cta_label: optionalText(40),
  cta_href: href.optional(),
})

export const INFO_ICONS = ["truck", "shield", "flag", "card", "return", "box"] as const

export const InfoTilesSection = z.object({
  ...base,
  type: z.literal("info_tiles"),
  title: optionalText(80),
  items: z
    .array(z.object({ icon: z.enum(INFO_ICONS), title: text(80), text: text(240), href: href.optional() }))
    .min(1)
    .max(6),
})

export const SectionSchema = z.discriminatedUnion("type", [
  AnnouncementBarSection,
  HeroSliderSection,
  CategoryTilesSection,
  ProductRailSection,
  RecentlyViewedSection,
  BrandStorySection,
  InfoTilesSection,
])
export type Section = z.infer<typeof SectionSchema>
export type SectionType = Section["type"]

export const PageContentSchema = z
  .object({ sections: z.array(SectionSchema).max(40) })
  .refine((c) => new Set(c.sections.map((s) => s.id)).size === c.sections.length, { message: "Identyfikatory sekcji muszą być unikalne" })
  .refine((c) => c.sections.filter((s) => s.type === "announcement_bar").length <= 1, { message: "Pasek informacyjny może być tylko jeden" })
  .superRefine((c, ctx) => {
    c.sections.forEach((s, i) => {
      if (s.type !== "product_rail") {
        return
      }
      if (s.source === "category" && !s.category_handle) {
        ctx.addIssue({ code: "custom", path: ["sections", i, "category_handle"], message: "Wybierz kategorię" })
      }
      if (s.source === "products" && !s.product_handles?.length) {
        ctx.addIssue({ code: "custom", path: ["sections", i, "product_handles"], message: "Wybierz produkty" })
      }
      if (!s.link_label !== !s.link_href) {
        ctx.addIssue({ code: "custom", path: ["sections", i, "link_href"], message: "Link wymaga etykiety i adresu" })
      }
    })
  })
export type PageContent = z.infer<typeof PageContentSchema>

export const PAGE_KEYS = ["home"] as const
export type PageKey = (typeof PAGE_KEYS)[number]
