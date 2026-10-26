import { defineRouteConfig } from "@medusajs/admin-sdk"
import { House } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Switch, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type DragEvent } from "react"
import { sdk } from "../../lib/sdk"
import { SECTION_DEFS, sectionSummary, type Field, type ListField, type SectionType } from "./fields"

type Section = Record<string, any> & { id: string; type: SectionType; enabled: boolean }
type Version = { id: string; version: number; status: "draft" | "published" | "archived"; note: string | null; published_at: string | null; updated_at: string }
type PageData = {
  draft: (Version & { content: { sections: Section[] } }) | null
  published: (Version & { content: { sections: Section[] } }) | null
  history: Version[]
}

const STATUS: Record<Version["status"], { label: string; color: "green" | "orange" | "grey" }> = {
  published: { label: "Opublikowana", color: "green" },
  draft: { label: "Szkic", color: "orange" },
  archived: { label: "Archiwum", color: "grey" },
}

const ITEM_NAMES: Record<string, string> = { slides: "slajd", messages: "komunikat", items: "kafelek" }

/** „sections.7.messages.0.href: …” → „Sekcja 8 (Pasek informacyjny), komunikat 1: …” */
function readableError(message: string, sections: Section[]) {
  return message.replace(/sections\.(\d+)(?:\.(slides|messages|items)\.(\d+))?(?:\.[a-z_]+(?:\.\d+)?)?: /g, (_, i, list, j) => {
    const s = sections[Number(i)]
    const name = s ? SECTION_DEFS[s.type]?.label : undefined
    const item = list ? `, ${ITEM_NAMES[list]} ${Number(j) + 1}` : ""
    return `Sekcja ${Number(i) + 1}${name ? ` (${name})` : ""}${item}: `
  })
}

const newId = () => `s${Math.random().toString(36).slice(2, 10)}`
const dateTime = (v: string | null) => (v ? new Date(v).toLocaleString("pl-PL") : "—")

/** Usuwa puste pola (backend traktuje je jako brak wartości) i zamienia listy uchwytów na tablice. */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(clean)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== "" && v !== undefined && v !== null)
        .map(([k, v]) => [k, clean(v)])
    )
  }
  return typeof value === "string" ? value.trim() : value
}

function FieldInput({ field, value, onChange, idPrefix, categories }: { field: Field; value: any; onChange: (v: any) => void; idPrefix: string; categories: { handle: string; name: string }[] }) {
  const id = `${idPrefix}-${field.key}`
  const hintId = field.hint ? `${id}-hint` : undefined
  const label = (
    <Label htmlFor={id} size="small" weight="plus">
      {field.label}
    </Label>
  )
  const hint = field.hint ? (
    <Text id={hintId} size="xsmall" className="text-ui-fg-subtle">
      {field.hint}
    </Text>
  ) : null
  const selectClass = "h-8 rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm"
  switch (field.kind) {
    case "checkbox":
      return (
        <div className="flex items-center gap-x-2">
          <Switch id={id} checked={!!value} onCheckedChange={onChange} />
          {label}
        </div>
      )
    case "textarea":
      return (
        <div className="flex flex-col gap-y-1">
          {label}
          <Textarea id={id} rows={4} value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-describedby={hintId} />
          {hint}
        </div>
      )
    case "number":
      return (
        <div className="flex flex-col gap-y-1">
          {label}
          <Input id={id} size="small" type="number" min={2} max={24} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
      )
    case "select":
      return (
        <div className="flex flex-col gap-y-1">
          {label}
          <select id={id} className={selectClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )
    case "category":
      return (
        <div className="flex flex-col gap-y-1">
          {label}
          <select id={id} className={selectClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">— wybierz —</option>
            {categories.map((c) => (
              <option key={c.handle} value={c.handle}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )
    case "handles":
      return (
        <div className="flex flex-col gap-y-1">
          {label}
          <Input
            id={id}
            size="small"
            value={Array.isArray(value) ? value.join(", ") : (value ?? "")}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
      )
    default:
      return (
        <div className="flex flex-col gap-y-1">
          {label}
          <Input id={id} size="small" value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-describedby={hintId} />
          {hint}
        </div>
      )
  }
}

function ListEditor({ list, items, onChange, idPrefix, categories }: { list: ListField; items: any[]; onChange: (v: any[]) => void; idPrefix: string; categories: { handle: string; name: string }[] }) {
  const set = (i: number, key: string, v: unknown) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)))
  const move = (i: number, d: number) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <fieldset className="flex flex-col gap-y-3">
      <legend className="txt-compact-small-plus mb-2">{list.label}</legend>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-y-3 rounded-md border border-ui-border-base p-3">
          <div className="flex items-center justify-between">
            <Text size="small" weight="plus">
              {list.itemLabel} {i + 1}
            </Text>
            <div className="flex gap-x-1">
              <Button size="small" variant="transparent" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${list.itemLabel} ${i + 1}: w górę`}>
                ↑
              </Button>
              <Button size="small" variant="transparent" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`${list.itemLabel} ${i + 1}: w dół`}>
                ↓
              </Button>
              <Button size="small" variant="transparent" disabled={items.length <= list.min} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                Usuń
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {list.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={item[f.key]} onChange={(v) => set(i, f.key, v)} idPrefix={`${idPrefix}-${i}`} categories={categories} />
            ))}
          </div>
        </div>
      ))}
      {items.length < list.max ? (
        <Button size="small" variant="secondary" className="self-start" onClick={() => onChange([...items, { ...list.empty }])}>
          Dodaj: {list.itemLabel.toLowerCase()}
        </Button>
      ) : null}
    </fieldset>
  )
}

const HomepagePage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["patrix-cms-home"], queryFn: () => sdk.client.fetch<PageData>("/admin/patrix/cms/pages/home") })
  const { data: cats } = useQuery({
    queryKey: ["patrix-cms-categories"],
    queryFn: () => sdk.client.fetch<{ product_categories: { handle: string; name: string }[] }>("/admin/product-categories", { query: { fields: "handle,name", limit: 500 } }),
  })
  const categories = cats?.product_categories ?? []

  const [sections, setSections] = useState<Section[] | null>(null)
  const [dirty, setDirty] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  const [newType, setNewType] = useState<SectionType>("product_rail")

  useEffect(() => {
    if (data && !dirty) {
      setSections((data.draft ?? data.published)?.content.sections ?? [])
    }
  }, [data, dirty])

  const update = (next: Section[]) => {
    setSections(next)
    setDirty(true)
  }
  const patch = (id: string, key: string, value: unknown) => update((sections ?? []).map((s) => (s.id === id ? { ...s, [key]: value } : s)))
  const move = (from: number, to: number) => {
    if (!sections || to < 0 || to >= sections.length || from === to) {
      return
    }
    const next = [...sections]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    update(next)
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["patrix-cms-home"] })
  const onError = (e: Error) => toast.error("Nie zapisano", { description: readableError(e.message, sections ?? []) })
  const saveDraft = () => sdk.client.fetch("/admin/patrix/cms/pages/home/draft", { method: "POST", body: { content: clean({ sections }) } })

  const save = useMutation({
    mutationFn: saveDraft,
    onSuccess: () => {
      setDirty(false)
      refresh()
      toast.success("Zapisano szkic")
    },
    onError,
  })
  const preview = useMutation({
    mutationFn: async () => {
      if (dirty || !data?.draft) {
        await saveDraft()
      }
      return sdk.client.fetch<{ url: string }>("/admin/patrix/cms/pages/home/preview", { method: "POST" })
    },
    onSuccess: ({ url }) => {
      setDirty(false)
      refresh()
      window.open(url, "_blank", "noopener")
    },
    onError,
  })
  const publish = useMutation({
    mutationFn: async () => {
      if (dirty || !data?.draft) {
        await saveDraft()
      }
      return sdk.client.fetch("/admin/patrix/cms/pages/home/publish", { method: "POST" })
    },
    onSuccess: () => {
      setDirty(false)
      refresh()
      toast.success("Opublikowano", { description: "Sklep pokaże zmiany w ciągu kilku minut." })
    },
    onError,
  })
  const discard = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/patrix/cms/pages/home/draft", { method: "DELETE" }),
    onSuccess: () => {
      setDirty(false)
      refresh()
      toast.success("Odrzucono szkic")
    },
    onError,
  })
  const restore = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/patrix/cms/pages/home/versions/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      setDirty(false)
      refresh()
      toast.success("Przywrócono wersję do szkicu", { description: "Sprawdź podgląd i opublikuj." })
    },
    onError,
  })

  const addSection = () => {
    const id = newId()
    update([...(sections ?? []), { id, type: newType, enabled: true, ...SECTION_DEFS[newType].create() } as Section])
    setOpen(id)
  }

  const onDragStart = (i: number) => (e: DragEvent) => {
    setDragged(i)
    e.dataTransfer.effectAllowed = "move"
  }
  const onDrop = (i: number) => (e: DragEvent) => {
    e.preventDefault()
    if (dragged !== null) {
      move(dragged, i)
    }
    setDragged(null)
  }

  const busy = save.isPending || preview.isPending || publish.isPending
  const hasBar = (sections ?? []).some((s) => s.type === "announcement_bar")

  if (isLoading || !sections) {
    return (
      <Container>
        <Text>Wczytywanie…</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
          <div>
            <Heading level="h1">Strona główna</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Kolejność zmieniasz przeciągając sekcje albo strzałkami. Zmiany trafiają do szkicu; klienci widzą je po publikacji.
            </Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {data?.published ? <Badge color="green">Opublikowana: wersja {data.published.version}</Badge> : <Badge color="grey">Brak publikacji</Badge>}
              {data?.draft ? <Badge color="orange">Szkic: wersja {data.draft.version}</Badge> : null}
              {dirty ? <Badge color="red">Niezapisane zmiany</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="small" variant="secondary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={busy || !dirty}>
              Zapisz szkic
            </Button>
            <Button size="small" variant="secondary" onClick={() => preview.mutate()} isLoading={preview.isPending} disabled={busy}>
              Podgląd
            </Button>
            <Button
              size="small"
              onClick={() => window.confirm("Opublikować stronę główną? Klienci zobaczą zmiany w ciągu kilku minut.") && publish.mutate()}
              isLoading={publish.isPending}
              disabled={busy || (!dirty && !data?.draft)}
            >
              Opublikuj
            </Button>
          </div>
        </div>

        <ol className="flex flex-col" aria-label="Sekcje strony głównej">
          {sections.map((s, i) => {
            const def = SECTION_DEFS[s.type]
            const expanded = open === s.id
            return (
              <li
                key={s.id}
                draggable
                onDragStart={onDragStart(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop(i)}
                onDragEnd={() => setDragged(null)}
                className={`border-b border-ui-border-base px-6 py-3 ${dragged === i ? "opacity-50" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span aria-hidden className="cursor-grab select-none text-ui-fg-muted" title="Przeciągnij, aby zmienić kolejność">
                    ⠿
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Text size="small" weight="plus">
                      {i + 1}. {def?.label ?? s.type}
                    </Text>
                    <Text size="xsmall" className="truncate text-ui-fg-subtle">
                      {sectionSummary(s) || "—"}
                    </Text>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Switch id={`on-${s.id}`} checked={s.enabled !== false} onCheckedChange={(v) => patch(s.id, "enabled", v)} />
                    <Label htmlFor={`on-${s.id}`} size="xsmall">
                      Widoczna
                    </Label>
                  </div>
                  <Button size="small" variant="transparent" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Sekcja ${i + 1}: w górę`}>
                    ↑
                  </Button>
                  <Button size="small" variant="transparent" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)} aria-label={`Sekcja ${i + 1}: w dół`}>
                    ↓
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => setOpen(expanded ? null : s.id)} aria-expanded={expanded}>
                    {expanded ? "Zwiń" : "Edytuj"}
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => window.confirm(`Usunąć sekcję „${def?.label}”?`) && update(sections.filter((x) => x.id !== s.id))}
                  >
                    Usuń
                  </Button>
                </div>
                {expanded && def ? (
                  <div className="mt-4 flex flex-col gap-y-4 rounded-md bg-ui-bg-subtle p-4">
                    <Text size="small" className="text-ui-fg-subtle">
                      {def.description}
                    </Text>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {def.fields.map((f) => (
                        <FieldInput key={f.key} field={f} value={s[f.key]} onChange={(v) => patch(s.id, f.key, v)} idPrefix={s.id} categories={categories} />
                      ))}
                    </div>
                    {def.lists?.map((l) => (
                      <ListEditor key={l.key} list={l} items={s[l.key] ?? []} onChange={(v) => patch(s.id, l.key, v)} idPrefix={`${s.id}-${l.key}`} categories={categories} />
                    ))}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="flex flex-wrap items-end gap-3 px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="new-section" size="small" weight="plus">
              Nowa sekcja
            </Label>
            <select id="new-section" className="h-8 rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm" value={newType} onChange={(e) => setNewType(e.target.value as SectionType)}>
              {(Object.keys(SECTION_DEFS) as SectionType[])
                .filter((t) => t !== "announcement_bar" || !hasBar)
                .map((t) => (
                  <option key={t} value={t}>
                    {SECTION_DEFS[t].label}
                  </option>
                ))}
            </select>
          </div>
          <Button size="small" variant="secondary" onClick={addSection}>
            Dodaj sekcję
          </Button>
          {data?.draft ? (
            <Button size="small" variant="transparent" onClick={() => window.confirm("Odrzucić szkic i wrócić do wersji opublikowanej?") && discard.mutate()}>
              Odrzuć szkic
            </Button>
          ) : null}
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Historia wersji</Heading>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Wersja</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Notatka</Table.HeaderCell>
              <Table.HeaderCell>Opublikowano</Table.HeaderCell>
              <Table.HeaderCell>Zmieniono</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.history ?? []).map((v) => (
              <Table.Row key={v.id}>
                <Table.Cell>{v.version}</Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS[v.status].color}>{STATUS[v.status].label}</Badge>
                </Table.Cell>
                <Table.Cell>{v.note ?? "—"}</Table.Cell>
                <Table.Cell>{dateTime(v.published_at)}</Table.Cell>
                <Table.Cell>{dateTime(v.updated_at)}</Table.Cell>
                <Table.Cell>
                  {v.status === "draft" ? null : (
                    <Button size="small" variant="secondary" onClick={() => restore.mutate(v.id)} isLoading={restore.isPending}>
                      Przywróć do szkicu
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "Strona główna", icon: House })

export default HomepagePage
