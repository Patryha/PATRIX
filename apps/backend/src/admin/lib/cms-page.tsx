import { Badge, Button, Container, Heading, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"
import { sdk } from "./sdk"

/** Wspólna obsługa stron CMS w panelu: szkic, podgląd, publikacja, historia wersji. */
export type Version = {
  id: string
  version: number
  status: "draft" | "published" | "archived"
  note: string | null
  published_at: string | null
  updated_at: string
}
export type PageData<C> = { draft: (Version & { content: C }) | null; published: (Version & { content: C }) | null; history: Version[] }

const STATUS: Record<Version["status"], { label: string; color: "green" | "orange" | "grey" }> = {
  published: { label: "Opublikowana", color: "green" },
  draft: { label: "Szkic", color: "orange" },
  archived: { label: "Archiwum", color: "grey" },
}

const dateTime = (v: string | null) => (v ? new Date(v).toLocaleString("pl-PL") : "—")

/** Usuwa puste pola (backend traktuje je jako brak wartości) i przycina teksty. */
export function clean(value: unknown): unknown {
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

export function useCmsPage<C>(key: "home" | "layout", readableError: (message: string, content: C | null) => string = (m) => m) {
  const queryClient = useQueryClient()
  const queryKey = ["patrix-cms", key]
  const base = `/admin/patrix/cms/pages/${key}`
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => sdk.client.fetch<PageData<C>>(base) })
  const [content, setContent] = useState<C | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data && !dirty) {
      setContent((data.draft ?? data.published)?.content ?? null)
    }
  }, [data, dirty])

  const update = (next: C) => {
    setContent(next)
    setDirty(true)
  }
  const refresh = () => queryClient.invalidateQueries({ queryKey })
  const onError = (e: Error) => toast.error("Nie zapisano", { description: readableError(e.message, content) })
  const saveDraft = () => sdk.client.fetch(`${base}/draft`, { method: "POST", body: { content: clean(content) } })
  const done = (message?: string, description?: string) => () => {
    setDirty(false)
    refresh()
    if (message) {
      toast.success(message, description ? { description } : undefined)
    }
  }

  const save = useMutation({ mutationFn: saveDraft, onSuccess: done("Zapisano szkic"), onError })
  const preview = useMutation({
    mutationFn: async () => {
      if (dirty || !data?.draft) {
        await saveDraft()
      }
      return sdk.client.fetch<{ url: string }>(`${base}/preview`, { method: "POST" })
    },
    onSuccess: ({ url }) => {
      done()()
      window.open(url, "_blank", "noopener")
    },
    onError,
  })
  const publish = useMutation({
    mutationFn: async () => {
      if (dirty || !data?.draft) {
        await saveDraft()
      }
      return sdk.client.fetch(`${base}/publish`, { method: "POST" })
    },
    onSuccess: done("Opublikowano", "Sklep pokaże zmiany w ciągu kilku minut."),
    onError,
  })
  const discard = useMutation({
    mutationFn: () => sdk.client.fetch(`${base}/draft`, { method: "DELETE" }),
    onSuccess: done("Odrzucono szkic"),
    onError,
  })
  const restore = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`${base}/versions/${id}/restore`, { method: "POST" }),
    onSuccess: done("Przywrócono wersję do szkicu", "Sprawdź podgląd i opublikuj."),
    onError,
  })
  return { data, isLoading, content, update, dirty, save, preview, publish, discard, restore }
}

type Page<C> = ReturnType<typeof useCmsPage<C>>

/** Nagłówek strony CMS: stan wersji i przyciski Zapisz / Podgląd / Opublikuj. */
export function CmsToolbar<C>({ page, title, description, publishQuestion }: { page: Page<C>; title: string; description: ReactNode; publishQuestion: string }) {
  const { data, dirty, save, preview, publish } = page
  const busy = save.isPending || preview.isPending || publish.isPending
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
      <div>
        <Heading level="h1">{title}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {description}
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
          onClick={() => window.confirm(publishQuestion) && publish.mutate()}
          isLoading={publish.isPending}
          disabled={busy || (!dirty && !data?.draft)}
        >
          Opublikuj
        </Button>
      </div>
    </div>
  )
}

export function DiscardDraftButton<C>({ page }: { page: Page<C> }) {
  return page.data?.draft ? (
    <Button size="small" variant="transparent" onClick={() => window.confirm("Odrzucić szkic i wrócić do wersji opublikowanej?") && page.discard.mutate()}>
      Odrzuć szkic
    </Button>
  ) : null
}

export function VersionHistory<C>({ page }: { page: Page<C> }) {
  return (
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
          {(page.data?.history ?? []).map((v) => (
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
                  <Button size="small" variant="secondary" onClick={() => page.restore.mutate(v.id)} isLoading={page.restore.isPending}>
                    Przywróć do szkicu
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}
