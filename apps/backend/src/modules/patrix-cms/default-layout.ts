import type { LayoutContent } from "./layout"

/**
 * Startowe menu i stopka: tylko linki do istniejących stron sklepu. Grafik kategorii i danych kontaktowych
 * nie wymyślamy: uzupełnia je właściciel w panelu („Menu i stopka”).
 */
export const DEFAULT_LAYOUT: LayoutContent = {
  menu: { items: [] },
  footer: {
    about: "Niemiecka jakość na co dzień. Oryginalne produkty importowane z Niemiec.",
    columns: [
      {
        title: "Zakupy",
        links: [
          { label: "Wyszukiwarka produktów", href: "/szukaj" },
          { label: "Nowości z Niemiec", href: "/kategoria/nowosci-z-niemiec" },
          { label: "Promocje", href: "/kategoria/promocje" },
          { label: "Ulubione", href: "/ulubione" },
        ],
      },
      {
        title: "Konto",
        links: [
          { label: "Moje konto", href: "/konto" },
          { label: "Załóż konto", href: "/rejestracja" },
          { label: "Koszyk", href: "/koszyk" },
        ],
      },
      {
        title: "Informacje",
        links: [
          { label: "Regulamin", href: "/regulamin" },
          { label: "Polityka prywatności", href: "/polityka-prywatnosci" },
        ],
      },
    ],
    contact: {},
    note: "Sklep w przygotowaniu. Dane firmy zostaną opublikowane przed uruchomieniem sprzedaży.",
  },
}
