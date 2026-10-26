import { z } from "@medusajs/framework/zod"
import { handle, href, imageUrl, optionalText, text } from "./sections"

/**
 * Menu i stopka sklepu (strona CMS „layout”). Dane kontaktowe wpisuje właściciel w panelu;
 * schemat nie ma wartości domyślnych dla danych firmy.
 */
export const MenuItemSchema = z
  .object({
    category_handle: handle,
    image_url: imageUrl.optional(),
    image_alt: optionalText(200),
  })
  .refine((m) => !m.image_url || !!m.image_alt, { message: "Obraz wymaga tekstu alternatywnego", path: ["image_alt"] })

export const FooterColumnSchema = z.object({
  title: text(60),
  links: z.array(z.object({ label: text(60), href })).min(1).max(10),
})

export const LayoutContentSchema = z
  .object({
    menu: z.object({ items: z.array(MenuItemSchema).max(30).default([]) }),
    footer: z.object({
      about: optionalText(400),
      columns: z.array(FooterColumnSchema).max(4).default([]),
      contact: z
        .object({
          email: z.string().trim().email("Niepoprawny adres e-mail").max(120).optional(),
          phone: z
            .string()
            .trim()
            .regex(/^\+?[0-9 ()-]{6,20}$/, "Niepoprawny numer telefonu")
            .optional(),
          hours: optionalText(120),
        })
        .default({}),
      note: optionalText(300),
    }),
  })
  .refine((c) => new Set(c.menu.items.map((m) => m.category_handle)).size === c.menu.items.length, {
    message: "Każda kategoria może mieć w menu tylko jedną grafikę",
    path: ["menu", "items"],
  })
export type LayoutContent = z.infer<typeof LayoutContentSchema>
