/** Menu i stopka z CMS (strona „layout”). Typy odpowiadają schematowi w backendzie (patrix-cms/layout.ts). */
export type MenuItem = { category_handle: string; image_url?: string; image_alt?: string }

export type LayoutContent = {
  menu: { items: MenuItem[] }
  footer: {
    about?: string
    columns: { title: string; links: { label: string; href: string }[] }[]
    contact: { email?: string; phone?: string; hours?: string }
    note?: string
  }
}

/** Gdy CMS jest niedostępny: tylko linki do stron sklepu (bez danych firmy). */
export const FALLBACK_LAYOUT: LayoutContent = {
  menu: { items: [] },
  footer: {
    about: "Niemiecka jakość na co dzień. Oryginalne produkty importowane z Niemiec.",
    columns: [
      {
        title: "Zakupy",
        links: [
          { label: "Wyszukiwarka produktów", href: "/szukaj" },
          { label: "Ulubione", href: "/ulubione" },
          { label: "Koszyk", href: "/koszyk" },
        ],
      },
    ],
    contact: {},
  },
}

/** Grafiki kategorii do mega menu, po uchwycie kategorii. */
export function menuImages(layout: LayoutContent): Record<string, { url: string; alt: string }> {
  return Object.fromEntries(
    layout.menu.items.filter((i) => i.image_url && i.image_alt).map((i) => [i.category_handle, { url: i.image_url as string, alt: i.image_alt as string }])
  )
}
