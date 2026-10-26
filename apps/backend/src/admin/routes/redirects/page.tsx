import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath } from "@medusajs/icons"
import { Badge, Button, Checkbox, Container, Heading, Input, Label, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Redirect = { id: string; from_path: string; to_path: string; permanent: boolean; note: string | null }

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Nie udało się zapisać.")

function RedirectForm({ initial, onDone }: { initial: Redirect | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(initial?.from_path ?? "")
  const [to, setTo] = useState(initial?.to_path ?? "")
  const [permanent, setPermanent] = useState(initial?.permanent ?? true)
  const [note, setNote] = useState(initial?.note ?? "")
  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(initial ? `/admin/patrix/redirects/${initial.id}` : "/admin/patrix/redirects", {
        method: "POST",
        body: { from_path: from, to_path: to, permanent, note: note.trim() || null },
      }),
    onSuccess: () => {
      toast.success("Zapisano przekierowanie. Sklep stosuje je w ciągu minuty.")
      queryClient.invalidateQueries({ queryKey: ["patrix-redirects"] })
      onDone()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <form
      className="grid gap-3 rounded-lg border border-ui-border-base p-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="redirect-from">Stary adres</Label>
        <Input id="redirect-from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/stary-sklep/produkt.html" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="redirect-to">Nowy adres</Label>
        <Input id="redirect-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="/produkt/nowy-uchwyt" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="redirect-note">Notatka (opcjonalnie)</Label>
        <Input id="redirect-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <Checkbox id="redirect-permanent" checked={permanent} onCheckedChange={(v) => setPermanent(v === true)} />
        <Label htmlFor="redirect-permanent">Na stałe (301). Odznacz dla tymczasowego (302).</Label>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" size="small" isLoading={save.isPending} disabled={!from.trim() || !to.trim()}>
          {initial ? "Zapisz zmiany" : "Dodaj przekierowanie"}
        </Button>
        <Button type="button" size="small" variant="secondary" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}

const RedirectsPage = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Redirect | "new" | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-redirects"],
    queryFn: () => sdk.client.fetch<{ redirects: Redirect[] }>("/admin/patrix/redirects"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/patrix/redirects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Usunięto przekierowanie.")
      queryClient.invalidateQueries({ queryKey: ["patrix-redirects"] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Container className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Heading level="h1">Przekierowania</Heading>
        <Text className="text-ui-fg-subtle">
          Stare adresy (np. po zmianie uchwytu produktu albo z poprzedniego sklepu) prowadzą do nowych, a wyszukiwarki przenoszą na nie pozycję. Tylko adresy w
          sklepie, bez łańcuchów przekierowań.
        </Text>
      </div>
      {editing ? (
        <RedirectForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <Button size="small" variant="secondary" onClick={() => setEditing("new")}>
            Dodaj przekierowanie
          </Button>
        </div>
      )}
      {isLoading ? <Text>Wczytywanie…</Text> : null}
      {isError ? <Text className="text-ui-fg-error">Nie udało się wczytać przekierowań.</Text> : null}
      {data && !data.redirects.length ? <Text className="text-ui-fg-subtle">Brak przekierowań.</Text> : null}
      {data?.redirects.length ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Stary adres</Table.HeaderCell>
              <Table.HeaderCell>Nowy adres</Table.HeaderCell>
              <Table.HeaderCell>Rodzaj</Table.HeaderCell>
              <Table.HeaderCell>Notatka</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.redirects.map((r) => (
              <Table.Row key={r.id}>
                <Table.Cell className="font-mono text-xs">{r.from_path}</Table.Cell>
                <Table.Cell className="font-mono text-xs">{r.to_path}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={r.permanent ? "green" : "orange"}>
                    {r.permanent ? "301 na stałe" : "302 tymczasowe"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{r.note ?? "–"}</Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="small" variant="transparent" onClick={() => setEditing(r)}>
                      Edytuj
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      isLoading={remove.isPending && remove.variables === r.id}
                      onClick={() => {
                        if (window.confirm(`Usunąć przekierowanie ${r.from_path}?`)) {
                          remove.mutate(r.id)
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

export const config = defineRouteConfig({ label: "Przekierowania", icon: ArrowPath })

export default RedirectsPage
