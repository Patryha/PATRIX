import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Switch, Table, Tabs, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Synonym = { id: string; terms: string[]; note: string | null; created_at: string }
type TermStat = { id: string; term: string; searches: number; zero_results: number; last_results: number; last_searched_at: string }
type Preview = { partial: boolean; suggestion: string | null; hits: { id: string; score: number; title: string; brand: string | null }[] }

const dateTime = (d: string) => new Date(d).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Nie udało się zapisać.")
const parseTerms = (text: string) =>
  text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

function SynonymForm({ initial, onDone }: { initial?: Synonym | { terms: string[]; note: null }; onDone: () => void }) {
  const queryClient = useQueryClient()
  const existing = initial && "id" in initial ? initial : null
  const [terms, setTerms] = useState(initial?.terms.join(", ") ?? "")
  const [note, setNote] = useState(initial?.note ?? "")
  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(existing ? `/admin/patrix/search/synonyms/${existing.id}` : "/admin/patrix/search/synonyms", {
        method: "POST",
        body: { terms: parseTerms(terms), note: note.trim() || null },
      }),
    onSuccess: () => {
      toast.success("Zapisano synonimy. Wyszukiwarka uwzględnia je od razu.")
      queryClient.invalidateQueries({ queryKey: ["patrix-search-synonyms"] })
      onDone()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const count = parseTerms(terms).length

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-ui-border-base p-4"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="synonym-terms">Określenia oznaczające to samo (oddziel przecinkami)</Label>
        <Input id="synonym-terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="np. odkamieniacz, Entkalker" />
        <Text size="small" className="text-ui-fg-subtle">
          Klient wpisujący dowolne z nich zobaczy produkty opisane pozostałymi. Od 2 do 20 określeń, każde 2–60 znaków.
        </Text>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="synonym-note">Notatka (opcjonalnie)</Label>
        <Input id="synonym-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="small" isLoading={save.isPending} disabled={count < 2}>
          {existing ? "Zapisz zmiany" : "Dodaj grupę"}
        </Button>
        <Button type="button" size="small" variant="secondary" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}

function SynonymsTab({ draft, clearDraft }: { draft: string | null; clearDraft: () => void }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Synonym | "new" | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-search-synonyms"],
    queryFn: () => sdk.client.fetch<{ synonyms: Synonym[] }>("/admin/patrix/search/synonyms"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/patrix/search/synonyms/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Usunięto grupę synonimów.")
      queryClient.invalidateQueries({ queryKey: ["patrix-search-synonyms"] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const showForm = editing !== null || draft !== null
  const closeForm = () => {
    setEditing(null)
    clearDraft()
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <SynonymForm
          key={editing && editing !== "new" ? editing.id : `new-${draft ?? ""}`}
          initial={editing && editing !== "new" ? editing : draft ? { terms: [draft], note: null } : undefined}
          onDone={closeForm}
        />
      ) : (
        <div>
          <Button size="small" variant="secondary" onClick={() => setEditing("new")}>
            Dodaj grupę synonimów
          </Button>
        </div>
      )}
      {isLoading ? <Text>Wczytywanie…</Text> : null}
      {isError ? <Text className="text-ui-fg-error">Nie udało się wczytać synonimów.</Text> : null}
      {data && !data.synonyms.length ? (
        <Text className="text-ui-fg-subtle">Brak synonimów. Dodaj je na przykład dla nazw niemieckich i potocznych określeń produktów.</Text>
      ) : null}
      {data?.synonyms.length ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Określenia</Table.HeaderCell>
              <Table.HeaderCell>Notatka</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.synonyms.map((s) => (
              <Table.Row key={s.id}>
                <Table.Cell>
                  <div className="flex flex-wrap gap-1 py-1">
                    {s.terms.map((t) => (
                      <Badge key={t} size="2xsmall">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </Table.Cell>
                <Table.Cell>{s.note ?? "–"}</Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="small" variant="transparent" onClick={() => setEditing(s)}>
                      Edytuj
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      isLoading={remove.isPending && remove.variables === s.id}
                      onClick={() => {
                        if (window.confirm(`Usunąć grupę: ${s.terms.join(", ")}?`)) {
                          remove.mutate(s.id)
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
    </div>
  )
}

function TermsTab({ onAddSynonym }: { onAddSynonym: (term: string) => void }) {
  const [onlyZero, setOnlyZero] = useState(true)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-search-terms", onlyZero],
    queryFn: () => sdk.client.fetch<{ terms: TermStat[] }>(`/admin/patrix/search/terms?limit=100${onlyZero ? "&zero=1" : ""}`),
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Switch id="terms-zero" checked={onlyZero} onCheckedChange={setOnlyZero} />
        <Label htmlFor="terms-zero">Tylko frazy bez wyników</Label>
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        Frazy są zapisywane bez danych klientów. Fraza bez wyników to sygnał, że brakuje synonimu albo produktu w ofercie.
      </Text>
      {isLoading ? <Text>Wczytywanie…</Text> : null}
      {isError ? <Text className="text-ui-fg-error">Nie udało się wczytać fraz.</Text> : null}
      {data && !data.terms.length ? <Text className="text-ui-fg-subtle">Brak fraz do pokazania.</Text> : null}
      {data?.terms.length ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Fraza</Table.HeaderCell>
              <Table.HeaderCell>Wyszukiwań</Table.HeaderCell>
              <Table.HeaderCell>Bez wyników</Table.HeaderCell>
              <Table.HeaderCell>Ostatnio wyników</Table.HeaderCell>
              <Table.HeaderCell>Ostatnio</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.terms.map((t) => (
              <Table.Row key={t.id}>
                <Table.Cell>{t.term}</Table.Cell>
                <Table.Cell>{t.searches}</Table.Cell>
                <Table.Cell>{t.zero_results}</Table.Cell>
                <Table.Cell>{t.last_results}</Table.Cell>
                <Table.Cell>{dateTime(t.last_searched_at)}</Table.Cell>
                <Table.Cell className="text-right">
                  <Button size="small" variant="transparent" onClick={() => onAddSynonym(t.term)}>
                    Dodaj synonim
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ) : null}
    </div>
  )
}

function PreviewTab() {
  const [q, setQ] = useState("")
  const preview = useMutation({
    mutationFn: (phrase: string) => sdk.client.fetch<Preview>(`/admin/patrix/search/preview?q=${encodeURIComponent(phrase)}`),
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim()) {
            preview.mutate(q.trim())
          }
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="preview-q">Fraza</Label>
          <Input id="preview-q" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="Wpisz tak, jak wpisałby klient" />
        </div>
        <Button type="submit" size="small" isLoading={preview.isPending} disabled={!q.trim()}>
          Sprawdź
        </Button>
      </form>
      <Text size="small" className="text-ui-fg-subtle">Podgląd obejmuje opublikowane produkty ze wszystkich kanałów sprzedaży i nie trafia do statystyk.</Text>
      {preview.data ? (
        <div className="flex flex-col gap-2">
          {preview.data.partial ? <Badge color="orange">Brak pełnego dopasowania, pokazano wyniki częściowe</Badge> : null}
          {preview.data.suggestion ? <Text>Podpowiedź poprawki dla klienta: „{preview.data.suggestion}”</Text> : null}
          {preview.data.hits.length ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>#</Table.HeaderCell>
                  <Table.HeaderCell>Produkt</Table.HeaderCell>
                  <Table.HeaderCell>Marka</Table.HeaderCell>
                  <Table.HeaderCell>Trafność</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {preview.data.hits.map((h, i) => (
                  <Table.Row key={h.id}>
                    <Table.Cell>{i + 1}</Table.Cell>
                    <Table.Cell>
                      <a href={`/app/products/${h.id}`} className="text-ui-fg-interactive hover:underline">
                        {h.title}
                      </a>
                    </Table.Cell>
                    <Table.Cell>{h.brand ?? "–"}</Table.Cell>
                    <Table.Cell>{h.score}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            <Text>Brak wyników.</Text>
          )}
        </div>
      ) : null}
    </div>
  )
}

const SearchSettingsPage = () => {
  const [tab, setTab] = useState("synonyms")
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Container className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Heading level="h1">Wyszukiwarka</Heading>
        <Text className="text-ui-fg-subtle">
          Wyszukiwarka sklepu rozumie literówki, brak polskich znaków, nazwy niemieckie z etykiet i kody EAN. Tutaj dodasz synonimy, sprawdzisz frazy bez wyników
          i przetestujesz wyniki.
        </Text>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <Tabs.List>
          <Tabs.Trigger value="synonyms">Synonimy</Tabs.Trigger>
          <Tabs.Trigger value="terms">Frazy klientów</Tabs.Trigger>
          <Tabs.Trigger value="preview">Test wyszukiwania</Tabs.Trigger>
        </Tabs.List>
        <div className="pt-4">
          <Tabs.Content value="synonyms">
            <SynonymsTab draft={draft} clearDraft={() => setDraft(null)} />
          </Tabs.Content>
          <Tabs.Content value="terms">
            <TermsTab
              onAddSynonym={(term) => {
                setDraft(term)
                setTab("synonyms")
              }}
            />
          </Tabs.Content>
          <Tabs.Content value="preview">
            <PreviewTab />
          </Tabs.Content>
        </div>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Wyszukiwarka", icon: MagnifyingGlass })

export default SearchSettingsPage
