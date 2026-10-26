import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Text as TextIcon } from "@medusajs/icons"
import { Button, Container, Heading, Input, Label, Text, Textarea } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { CmsToolbar, DiscardDraftButton, useCmsPage, VersionHistory } from "../../lib/cms-page"
import { sdk } from "../../lib/sdk"

type MenuItem = { category_handle: string; image_url?: string; image_alt?: string }
type Column = { title: string; links: { label: string; href: string }[] }
type Layout = {
  menu: { items: MenuItem[] }
  footer: { about?: string; columns: Column[]; contact: { email?: string; phone?: string; hours?: string }; note?: string }
}

/** „footer.columns.1.links.0.href: …” → „Stopka, kolumna 2, link 1: …” */
function readableError(message: string) {
  return message
    .replace(/footer\.columns\.(\d+)\.links\.(\d+)\.[a-z_]+: /g, (_, c, l) => `Stopka, kolumna ${Number(c) + 1}, link ${Number(l) + 1}: `)
    .replace(/footer\.columns\.(\d+)\.[a-z_]+: /g, (_, c) => `Stopka, kolumna ${Number(c) + 1}: `)
    .replace(/footer\.contact\.([a-z]+): /g, "Stopka, kontakt: ")
    .replace(/menu\.items\.(\d+)\.[a-z_]+: /g, "Menu: ")
}

function TextField({ id, label, value, onChange, hint }: { id: string; label: string; value?: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="flex flex-col gap-y-1">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      <Input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint ? (
        <Text id={`${id}-hint`} size="xsmall" className="text-ui-fg-subtle">
          {hint}
        </Text>
      ) : null}
    </div>
  )
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) {
    return list
  }
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const MenuFooterPage = () => {
  const page = useCmsPage<Layout>("layout", (m) => readableError(m))
  const layout = page.content
  const { data: cats } = useQuery({
    queryKey: ["patrix-cms-top-categories"],
    queryFn: () =>
      sdk.client.fetch<{ product_categories: { handle: string; name: string }[] }>("/admin/product-categories", {
        query: { fields: "handle,name,rank", parent_category_id: "null", limit: 200 },
      }),
  })

  if (page.isLoading || !layout) {
    return (
      <Container>
        <Text>Wczytywanie…</Text>
      </Container>
    )
  }

  const { footer } = layout
  const setFooter = (patch: Partial<Layout["footer"]>) => page.update({ ...layout, footer: { ...footer, ...patch } })
  const setColumns = (columns: Column[]) => setFooter({ columns })
  const menuItem = (handle: string) => layout.menu.items.find((i) => i.category_handle === handle)
  const setMenuItem = (handle: string, patch: Partial<MenuItem>) => {
    const current = menuItem(handle) ?? { category_handle: handle }
    const next = { ...current, ...patch }
    const others = layout.menu.items.filter((i) => i.category_handle !== handle)
    // Wpis bez obrazu i opisu nie jest potrzebny.
    const items = next.image_url || next.image_alt ? [...others, next] : others
    page.update({ ...layout, menu: { items } })
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <CmsToolbar
          page={page}
          title="Menu i stopka"
          description="Grafiki kategorii w menu oraz treść stopki. Dane firmy i kontakt wpisuje właściciel; puste pola nie są pokazywane w sklepie."
          publishQuestion="Opublikować menu i stopkę? Klienci zobaczą zmiany w ciągu kilku minut."
        />

        <section aria-labelledby="menu-heading" className="flex flex-col gap-y-3 px-6 py-4">
          <Heading level="h2" id="menu-heading">
            Grafiki kategorii w menu
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Adres obrazu: https://… (np. z biblioteki plików) albo ścieżka sklepu /…. Obraz wymaga opisu dla osób niewidomych.
          </Text>
          <ul className="flex flex-col gap-y-3">
            {(cats?.product_categories ?? []).map((c) => {
              const item = menuItem(c.handle)
              return (
                <li key={c.handle} className="grid grid-cols-1 gap-3 rounded-md border border-ui-border-base p-3 md:grid-cols-[12rem_1fr_1fr]">
                  <Text weight="plus">{c.name}</Text>
                  <TextField id={`menu-${c.handle}-url`} label="Adres obrazu" value={item?.image_url} onChange={(v) => setMenuItem(c.handle, { image_url: v })} />
                  <TextField id={`menu-${c.handle}-alt`} label="Opis obrazu (alt)" value={item?.image_alt} onChange={(v) => setMenuItem(c.handle, { image_alt: v })} />
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="footer-heading" className="flex flex-col gap-y-4 px-6 py-4">
          <Heading level="h2" id="footer-heading">
            Stopka
          </Heading>
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="footer-about" size="small" weight="plus">
              Opis sklepu
            </Label>
            <Textarea id="footer-about" rows={3} value={footer.about ?? ""} onChange={(e) => setFooter({ about: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TextField id="contact-email" label="E-mail kontaktowy" value={footer.contact.email} onChange={(v) => setFooter({ contact: { ...footer.contact, email: v } })} />
            <TextField id="contact-phone" label="Telefon" value={footer.contact.phone} onChange={(v) => setFooter({ contact: { ...footer.contact, phone: v } })} />
            <TextField
              id="contact-hours"
              label="Godziny obsługi"
              value={footer.contact.hours}
              onChange={(v) => setFooter({ contact: { ...footer.contact, hours: v } })}
              hint="np. pn–pt 8–16"
            />
          </div>
          <TextField id="footer-note" label="Dopisek na dole stopki" value={footer.note} onChange={(v) => setFooter({ note: v })} />

          <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Kolumny stopki">
            {footer.columns.map((column, ci) => (
              <li key={ci} className="flex flex-col gap-y-2 rounded-md border border-ui-border-base p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1">
                    <TextField
                      id={`col-${ci}-title`}
                      label={`Kolumna ${ci + 1}: nagłówek`}
                      value={column.title}
                      onChange={(v) => setColumns(footer.columns.map((c, i) => (i === ci ? { ...c, title: v } : c)))}
                    />
                  </div>
                  <Button size="small" variant="transparent" disabled={ci === 0} onClick={() => setColumns(move(footer.columns, ci, ci - 1))} aria-label={`Kolumna ${ci + 1}: w lewo`}>
                    ←
                  </Button>
                  <Button
                    size="small"
                    variant="transparent"
                    disabled={ci === footer.columns.length - 1}
                    onClick={() => setColumns(move(footer.columns, ci, ci + 1))}
                    aria-label={`Kolumna ${ci + 1}: w prawo`}
                  >
                    →
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => window.confirm(`Usunąć kolumnę „${column.title}”?`) && setColumns(footer.columns.filter((_, i) => i !== ci))}
                  >
                    Usuń
                  </Button>
                </div>
                {column.links.map((link, li) => {
                  const setLinks = (links: Column["links"]) => setColumns(footer.columns.map((c, i) => (i === ci ? { ...c, links } : c)))
                  return (
                    <div key={li} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                      <TextField
                        id={`col-${ci}-link-${li}-label`}
                        label={`Link ${li + 1}: tekst`}
                        value={link.label}
                        onChange={(v) => setLinks(column.links.map((l, i) => (i === li ? { ...l, label: v } : l)))}
                      />
                      <TextField
                        id={`col-${ci}-link-${li}-href`}
                        label={`Link ${li + 1}: adres`}
                        value={link.href}
                        onChange={(v) => setLinks(column.links.map((l, i) => (i === li ? { ...l, href: v } : l)))}
                      />
                      <Button size="small" variant="transparent" onClick={() => setLinks(column.links.filter((_, i) => i !== li))} aria-label={`Usuń link ${li + 1}`}>
                        ✕
                      </Button>
                    </div>
                  )
                })}
                <Button
                  size="small"
                  variant="secondary"
                  disabled={column.links.length >= 10}
                  onClick={() => setColumns(footer.columns.map((c, i) => (i === ci ? { ...c, links: [...c.links, { label: "", href: "/" }] } : c)))}
                >
                  Dodaj link
                </Button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button
              size="small"
              variant="secondary"
              disabled={footer.columns.length >= 4}
              onClick={() => setColumns([...footer.columns, { title: "Nowa kolumna", links: [{ label: "", href: "/" }] }])}
            >
              Dodaj kolumnę
            </Button>
            <DiscardDraftButton page={page} />
          </div>
        </section>
      </Container>
      <VersionHistory page={page} />
    </div>
  )
}

export const config = defineRouteConfig({ label: "Menu i stopka", icon: TextIcon })

export default MenuFooterPage
