import type { PageContent } from "./types"

/** Strona główna, gdy CMS jest niedostępny albo nic nie opublikowano: same treści o marce i dane z katalogu. */
export const FALLBACK_HOME: PageContent = {
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
  ],
}
