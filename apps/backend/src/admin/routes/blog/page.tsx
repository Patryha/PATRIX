import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BookOpen } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { slugify } from "../../../modules/patrix-cms/blog"
import { sdk } from "../../lib/sdk"

type PostRow = { id: string; slug: string; title: string; status: "draft" | "published"; published_at: string | null; updated_at: string }
type Post = PostRow & {
  excerpt: string
  body: string
  cover_url: string | null
  cover_alt: string | null
  product_handles: string[]
  seo_title: string | null
  seo_description: string | null
}
type Status = Post["status"]

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Nie udało się zapisać.")
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("pl-PL") : "–")

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <Text size="small" className="text-ui-fg-subtle" id={`${id}-hint`}>
          {hint}
        </Text>
      ) : null}
    </div>
  )
}

function PostForm({ id, onDone }: { id: string | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-blog-post", id],
    queryFn: () => sdk.client.fetch<{ post: Post }>(`/admin/patrix/blog/${id}`),
    enabled: !!id,
    gcTime: 0,
  })
  if (id && isError) {
    return <Text className="text-ui-fg-error">Nie udało się wczytać wpisu.</Text>
  }
  if (id && (isLoading || !data)) {
    return <Text>Wczytywanie…</Text>
  }
  return (
    <PostEditor
      key={id ?? "new"}
      initial={data?.post ?? null}
      onDone={onDone}
      onSaved={() => queryClient.invalidateQueries({ queryKey: ["patrix-blog"] })}
    />
  )
}

function PostEditor({ initial, onDone, onSaved }: { initial: Post | null; onDone: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(!!initial)
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "")
  const [body, setBody] = useState(initial?.body ?? "")
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "")
  const [coverAlt, setCoverAlt] = useState(initial?.cover_alt ?? "")
  const [products, setProducts] = useState((initial?.product_handles ?? []).join(", "))
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? "")
  const [seoDescription, setSeoDescription] = useState(initial?.seo_description ?? "")
  const slugLocked = !!initial?.published_at
  const current: Status = initial?.status ?? "draft"

  const save = useMutation({
    mutationFn: (status: Status) =>
      sdk.client.fetch<{ post: Post }>(initial ? `/admin/patrix/blog/${initial.id}` : "/admin/patrix/blog", {
        method: "POST",
        body: {
          title,
          slug,
          excerpt,
          body,
          cover_url: coverUrl.trim() || null,
          cover_alt: coverAlt.trim() || null,
          product_handles: products
            .split(/[\s,]+/)
            .map((h) => h.trim())
            .filter(Boolean),
          seo_title: seoTitle.trim() || null,
          seo_description: seoDescription.trim() || null,
          status,
        },
      }),
    onSuccess: (_, status) => {
      toast.success(status === "published" ? "Zapisano. Wpis jest opublikowany; sklep pokaże zmiany w ciągu kilku minut." : "Zapisano szkic.")
      onSaved()
      onDone()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-ui-border-base p-4"
      onSubmit={(e) => {
        // Enter w polu zapisuje bez zmiany statusu wpisu.
        e.preventDefault()
        save.mutate(current)
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="post-title" label="Tytuł">
          <Input
            id="post-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slugTouched) {
                setSlug(slugify(e.target.value))
              }
            }}
          />
        </Field>
        <Field id="post-slug" label="Adres" hint={slugLocked ? "Adres opublikowanego wpisu się nie zmienia." : `W sklepie: /blog/${slug || "…"}`}>
          <Input
            id="post-slug"
            value={slug}
            disabled={slugLocked}
            aria-describedby="post-slug-hint"
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
          />
        </Field>
      </div>
      <Field id="post-excerpt" label="Zajawka" hint="10–300 znaków. Widoczna na liście wpisów i w wynikach wyszukiwania, jeśli nie podasz opisu SEO.">
        <Textarea id="post-excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} aria-describedby="post-excerpt-hint" />
      </Field>
      <Field
        id="post-body"
        label="Treść"
        hint="Pusta linia oddziela akapity. „## ” i „### ” na początku linii to nagłówki, „- ” to punkt listy, **tekst** pogrubia, [tekst](/produkt/uchwyt) to link (ścieżka sklepu albo https://)."
      >
        <Textarea id="post-body" rows={16} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby="post-body-hint" className="font-mono" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="post-cover" label="Okładka (opcjonalnie)" hint="Adres https:// albo ścieżka /... do zdjęcia.">
          <Input id="post-cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} aria-describedby="post-cover-hint" />
        </Field>
        <Field id="post-cover-alt" label="Opis okładki" hint="Wymagany przy okładce (dla czytników ekranu).">
          <Input id="post-cover-alt" value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} aria-describedby="post-cover-alt-hint" />
        </Field>
      </div>
      <Field id="post-products" label="Produkty pod wpisem (opcjonalnie)" hint="Uchwyty produktów oddzielone przecinkami, maks. 8. Nieopublikowane produkty się nie pokażą.">
        <Input id="post-products" value={products} onChange={(e) => setProducts(e.target.value)} aria-describedby="post-products-hint" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="post-seo-title" label="Tytuł SEO (opcjonalnie)" hint="Do 70 znaków; domyślnie tytuł wpisu.">
          <Input id="post-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} aria-describedby="post-seo-title-hint" />
        </Field>
        <Field id="post-seo-description" label="Opis SEO (opcjonalnie)" hint="Do 170 znaków; domyślnie zajawka.">
          <Input
            id="post-seo-description"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            aria-describedby="post-seo-description-hint"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="small" isLoading={save.isPending && save.variables === "published"} onClick={() => save.mutate("published")}>
          {current === "published" ? "Zapisz" : "Opublikuj"}
        </Button>
        <Button type="button" size="small" variant="secondary" isLoading={save.isPending && save.variables === "draft"} onClick={() => save.mutate("draft")}>
          {current === "published" ? "Wycofaj do szkicu" : "Zapisz szkic"}
        </Button>
        <Button type="button" size="small" variant="transparent" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}

const BlogPage = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | "new" | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-blog"],
    queryFn: () => sdk.client.fetch<{ posts: PostRow[]; storefront_url: string }>("/admin/patrix/blog"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/patrix/blog/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Usunięto wpis.")
      queryClient.invalidateQueries({ queryKey: ["patrix-blog"] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Container className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Heading level="h1">Blog</Heading>
        <Text className="text-ui-fg-subtle">
          Poradniki i nowości w sklepie pod adresem /blog. Opublikowane wpisy trafiają też do mapy strony. Link do bloga dodasz w menu lub stopce
          (strona „Menu i stopka”).
        </Text>
      </div>
      {editing ? (
        <PostForm id={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <Button size="small" variant="secondary" onClick={() => setEditing("new")}>
            Nowy wpis
          </Button>
        </div>
      )}
      {isLoading ? <Text>Wczytywanie…</Text> : null}
      {isError ? <Text className="text-ui-fg-error">Nie udało się wczytać wpisów.</Text> : null}
      {data && !data.posts.length ? <Text className="text-ui-fg-subtle">Brak wpisów.</Text> : null}
      {data?.posts.length ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Tytuł</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Publikacja</Table.HeaderCell>
              <Table.HeaderCell>Zmiana</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.posts.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell>
                  {p.status === "published" ? (
                    <a href={`${data.storefront_url}/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-ui-fg-interactive hover:underline">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={p.status === "published" ? "green" : "grey"}>
                    {p.status === "published" ? "Opublikowany" : "Szkic"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{formatDate(p.published_at)}</Table.Cell>
                <Table.Cell>{formatDate(p.updated_at)}</Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="small" variant="transparent" onClick={() => setEditing(p.id)}>
                      Edytuj
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      isLoading={remove.isPending && remove.variables === p.id}
                      onClick={() => {
                        if (window.confirm(`Usunąć wpis „${p.title}”?`)) {
                          remove.mutate(p.id)
                        }
                      }}
                    >
                      Usuń
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ) : null}
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Blog", icon: BookOpen })

export default BlogPage
