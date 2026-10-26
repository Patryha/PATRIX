/** Opis formularzy sekcji w panelu (etykiety po polsku, typy pól). Walidację wykonuje backend przy zapisie. */
export type FieldKind = "text" | "textarea" | "link" | "number" | "checkbox" | "select" | "category" | "handles"
export type Field = { key: string; label: string; kind: FieldKind; hint?: string; options?: { value: string; label: string }[] }
export type ListField = { key: string; label: string; itemLabel: string; min: number; max: number; fields: Field[]; empty: Record<string, unknown> }

export type SectionType = "announcement_bar" | "hero_slider" | "category_tiles" | "product_rail" | "recently_viewed" | "brand_story" | "info_tiles"

const LINK_HINT = "Ścieżka sklepu, np. /kategoria/promocje, albo adres https://"

export const SECTION_DEFS: Record<
  SectionType,
  { label: string; description: string; fields: Field[]; lists?: ListField[]; create: () => Record<string, unknown> }
> = {
  announcement_bar: {
    label: "Pasek informacyjny",
    description: "Krótkie komunikaty nad stroną, np. warunki dostawy. Tylko jeden na stronie.",
    fields: [],
    lists: [
      {
        key: "messages",
        label: "Komunikaty",
        itemLabel: "Komunikat",
        min: 1,
        max: 5,
        empty: { text: "" },
        fields: [
          { key: "text", label: "Treść (do 140 znaków)", kind: "text" },
          { key: "href", label: "Link (opcjonalnie)", kind: "link", hint: LINK_HINT },
        ],
      },
    ],
    create: () => ({ messages: [{ text: "" }] }),
  },
  hero_slider: {
    label: "Slider promocyjny",
    description: "Duży baner na początku strony. Kilka slajdów tworzy karuzelę z przyciskami i pauzą.",
    fields: [{ key: "autoplay", label: "Przewijaj automatycznie (co 7 s, z przyciskiem pauzy)", kind: "checkbox" }],
    lists: [
      {
        key: "slides",
        label: "Slajdy",
        itemLabel: "Slajd",
        min: 1,
        max: 6,
        empty: { title: "", theme: "brand" },
        fields: [
          { key: "eyebrow", label: "Nadtytuł (opcjonalnie)", kind: "text" },
          { key: "title", label: "Tytuł", kind: "text" },
          { key: "text", label: "Opis (opcjonalnie)", kind: "textarea" },
          { key: "image_url", label: "Adres obrazu (opcjonalnie)", kind: "link", hint: "Wgraj plik w Ustawieniach lub przy produkcie i wklej adres" },
          { key: "image_alt", label: "Tekst alternatywny obrazu", kind: "text", hint: "Wymagany, gdy jest obraz: co przedstawia" },
          { key: "cta_label", label: "Etykieta przycisku", kind: "text" },
          { key: "cta_href", label: "Link przycisku", kind: "link", hint: LINK_HINT },
          {
            key: "theme",
            label: "Wygląd",
            kind: "select",
            options: [
              { value: "brand", label: "Kolory marki (ciemne tło)" },
              { value: "light", label: "Jasne tło" },
            ],
          },
        ],
      },
    ],
    create: () => ({ autoplay: false, slides: [{ title: "", theme: "brand" }] }),
  },
  category_tiles: {
    label: "Kategorie z grafikami",
    description: "Kafelki kategorii. Bez wyboru: wszystkie kategorie główne w kolejności z katalogu.",
    fields: [
      { key: "title", label: "Nagłówek", kind: "text" },
      { key: "category_handles", label: "Kategorie (uchwyty, po przecinku; puste = wszystkie główne)", kind: "handles" },
    ],
    create: () => ({ title: "Kategorie", category_handles: [] }),
  },
  product_rail: {
    label: "Produkty (bestsellery, nowości, promocje, polecane…)",
    description: "Siatka produktów z wybranego źródła. Gdy źródło nie ma produktów, sekcja jest ukryta.",
    fields: [
      { key: "title", label: "Nagłówek", kind: "text" },
      {
        key: "source",
        label: "Źródło produktów",
        kind: "select",
        options: [
          { value: "newest", label: "Nowości (ostatnio dodane)" },
          { value: "bestsellers", label: "Bestsellery (sprzedaż z 30 dni)" },
          { value: "on_sale", label: "Promocje (aktywne obniżki)" },
          { value: "bundles", label: "Zestawy (produkty złożone z kilku pozycji magazynowych)" },
          { value: "category", label: "Kategoria (np. Hity z Niemiec)" },
          { value: "products", label: "Wybrane produkty (polecane)" },
        ],
      },
      { key: "category_handle", label: "Kategoria (dla źródła „Kategoria”)", kind: "category" },
      { key: "product_handles", label: "Produkty (uchwyty z adresu /produkt/…, po przecinku)", kind: "handles" },
      { key: "limit", label: "Liczba produktów (2–24)", kind: "number" },
      { key: "link_label", label: "Link „zobacz wszystkie”: etykieta (opcjonalnie)", kind: "text" },
      { key: "link_href", label: "Link „zobacz wszystkie”: adres", kind: "link", hint: LINK_HINT },
    ],
    create: () => ({ title: "", source: "newest", limit: 8 }),
  },
  recently_viewed: {
    label: "Ostatnio oglądane",
    description: "Produkty oglądane przez klienta (zapisywane tylko w jego przeglądarce). Ukryta, gdy lista jest pusta.",
    fields: [{ key: "title", label: "Nagłówek", kind: "text" }],
    create: () => ({ title: "Ostatnio oglądane" }),
  },
  brand_story: {
    label: "O marce PATRIX",
    description: "Tekst o sklepie z opcjonalnym obrazem i przyciskiem. Akapity oddziel pustą linią.",
    fields: [
      { key: "title", label: "Nagłówek", kind: "text" },
      { key: "text", label: "Treść", kind: "textarea" },
      { key: "image_url", label: "Adres obrazu (opcjonalnie)", kind: "link" },
      { key: "image_alt", label: "Tekst alternatywny obrazu", kind: "text" },
      { key: "cta_label", label: "Etykieta przycisku (opcjonalnie)", kind: "text" },
      { key: "cta_href", label: "Link przycisku", kind: "link", hint: LINK_HINT },
    ],
    create: () => ({ title: "", text: "" }),
  },
  info_tiles: {
    label: "Dostawa i płatności (kafelki informacyjne)",
    description: "Krótkie informacje z ikonami. Wpisuj tylko faktycznie dostępne usługi.",
    fields: [{ key: "title", label: "Nagłówek (opcjonalnie)", kind: "text" }],
    lists: [
      {
        key: "items",
        label: "Kafelki",
        itemLabel: "Kafelek",
        min: 1,
        max: 6,
        empty: { icon: "truck", title: "", text: "" },
        fields: [
          {
            key: "icon",
            label: "Ikona",
            kind: "select",
            options: [
              { value: "truck", label: "Dostawa" },
              { value: "card", label: "Płatność" },
              { value: "return", label: "Zwroty" },
              { value: "shield", label: "Bezpieczeństwo" },
              { value: "flag", label: "Niemcy" },
              { value: "box", label: "Paczka" },
            ],
          },
          { key: "title", label: "Tytuł", kind: "text" },
          { key: "text", label: "Opis", kind: "text" },
          { key: "href", label: "Link (opcjonalnie)", kind: "link", hint: LINK_HINT },
        ],
      },
    ],
    create: () => ({ items: [{ icon: "truck", title: "", text: "" }] }),
  },
}

/** Krótki opis sekcji na liście (nagłówek lub pierwszy slajd/komunikat). */
export function sectionSummary(s: Record<string, any>): string {
  return s.title || s.slides?.[0]?.title || s.messages?.[0]?.text || s.items?.[0]?.title || ""
}
