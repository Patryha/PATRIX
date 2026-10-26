import type { PageContent } from "./sections"

/**
 * Pierwsza wersja strony głównej (tworzona przez seed, gdy strona nie ma jeszcze żadnej wersji).
 * Zawiera wyłącznie treści o marce i ogólne informacje, bez promocji, cen i obietnic dotyczących usług:
 * te właściciel uzupełnia w panelu.
 */
export const DEFAULT_HOME: PageContent = {
  sections: [
    {
      id: "hero",
      type: "hero_slider",
      enabled: true,
      autoplay: false,
      slides: [
        {
          eyebrow: "Oryginalne produkty z Niemiec",
          title: "Niemiecka jakość na co dzień",
          text: "Chemia gospodarcza, kosmetyki, słodycze i napoje prosto z Niemiec. Wybieraj spośród sprawdzonych marek w jednym miejscu.",
          cta_label: "Zobacz nowości",
          cta_href: "/kategoria/nowosci-z-niemiec",
          theme: "brand",
        },
      ],
    },
    { id: "kategorie", type: "category_tiles", enabled: true, title: "Kategorie", category_handles: [] },
    { id: "nowosci", type: "product_rail", enabled: true, title: "Nowości", source: "newest", limit: 8 },
    { id: "promocje", type: "product_rail", enabled: true, title: "Promocje tygodnia", source: "on_sale", limit: 8 },
    { id: "bestsellery", type: "product_rail", enabled: true, title: "Bestsellery", source: "bestsellers", limit: 8 },
    { id: "ostatnio", type: "recently_viewed", enabled: true, title: "Ostatnio oglądane" },
    {
      id: "o-marce",
      type: "brand_story",
      enabled: true,
      title: "PATRIX: niemiecka jakość na co dzień",
      text: "Sprowadzamy oryginalne produkty z rynku niemieckiego, żeby ulubione marki były dostępne w Polsce w jednym miejscu.",
    },
  ],
}
