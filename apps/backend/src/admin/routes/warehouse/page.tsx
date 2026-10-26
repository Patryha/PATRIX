import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Select, Table, Tabs, Text, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type ExpiryState = "expired" | "soon" | "ok" | null
type Location = { id: string; name: string }
type BatchRow = { id: string; lot_number: string | null; expiry_date: string | null; quantity: number; state: ExpiryState }
type StockRow = {
  inventory_item_id: string
  sku: string | null
  title: string | null
  location_id: string
  location: string
  stocked: number
  reserved: number
  available: number
  untracked: number
  nearest_expiry: string | null
  expiry_state: ExpiryState
  batches: BatchRow[]
}
type Movement = {
  id: string
  type: "receipt" | "issue" | "adjustment" | "count" | "sale" | "transfer"
  quantity: number
  reason: string | null
  document_ref: string | null
  created_at: string
  item: { sku: string | null; title: string | null } | null
  batch: { lot_number: string | null; expiry_date: string | null } | null
}
type ExpiryBatch = BatchRow & { item: { sku: string | null; title: string | null } | null; location: string }
type StockCount = { id: string; location_id: string; status: "open" | "closed" | "canceled"; note: string | null; created_at: string; closed_at: string | null }
type CountLine = { id: string; sku: string | null; title: string | null; expected: number; counted: number | null; current: number; difference: number | null; applied: boolean }
type InventoryItem = { id: string; sku: string | null; title: string | null }

const MOVEMENT_LABEL: Record<Movement["type"], string> = {
  receipt: "przyjęcie",
  issue: "wydanie",
  adjustment: "korekta",
  count: "inwentaryzacja",
  sale: "sprzedaż",
  transfer: "przesunięcie (MM)",
}
const COUNT_STATUS: Record<StockCount["status"], { text: string; color: "blue" | "green" | "grey" }> = {
  open: { text: "otwarta", color: "blue" },
  closed: { text: "zatwierdzona", color: "green" },
  canceled: { text: "anulowana", color: "grey" },
}
const ALL = "__all"

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("pl-PL", { timeZone: "UTC" }) : "–")
const dateTime = (d: string) => new Date(d).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Nie udało się zapisać.")

function ExpiryBadge({ state, value }: { state: ExpiryState; value: string | null }) {
  if (!state) {
    return <Text size="small" className="text-ui-fg-muted">bez daty</Text>
  }
  const color = state === "expired" ? "red" : state === "soon" ? "orange" : "green"
  const label = state === "expired" ? "po terminie" : state === "soon" ? "kończy się" : "ok"
  return (
    <Badge size="2xsmall" color={color}>
      {date(value)} · {label}
    </Badge>
  )
}

function useLocations() {
  return useQuery({
    queryKey: ["patrix-warehouse-stock", ALL, ""],
    queryFn: () => sdk.client.fetch<{ locations: Location[]; stock: StockRow[] }>("/admin/patrix/warehouse/stock"),
    select: (d) => d.locations,
  })
}

function StockTab() {
  const [location, setLocation] = useState(ALL)
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-warehouse-stock", location, search],
    queryFn: () =>
      sdk.client.fetch<{ locations: Location[]; stock: StockRow[] }>("/admin/patrix/warehouse/stock", {
        query: { ...(location !== ALL ? { location_id: location } : {}), ...(search ? { q: search } : {}) },
      }),
  })
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
        }}
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="stock-location">Lokalizacja</Label>
          <Select value={location} onValueChange={setLocation}>
            <Select.Trigger id="stock-location" className="w-56">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL}>Wszystkie</Select.Item>
              {data?.locations.map((l) => (
                <Select.Item key={l.id} value={l.id}>
                  {l.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="stock-q">SKU lub nazwa</Label>
          <Input id="stock-q" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
        </div>
        <Button type="submit" variant="secondary">
          Szukaj
        </Button>
      </form>
      {isLoading && <Text>Wczytywanie…</Text>}
      {isError && <Text className="text-ui-fg-error">Nie udało się wczytać stanów.</Text>}
      {data && data.stock.length === 0 && <Text className="text-ui-fg-subtle">Brak stanów magazynowych dla wybranych filtrów.</Text>}
      {data && data.stock.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Towar</Table.HeaderCell>
              <Table.HeaderCell>Lokalizacja</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Na stanie</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Zarezerwowane</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Dostępne</Table.HeaderCell>
              <Table.HeaderCell>Partie (FEFO)</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.stock.map((r) => (
              <Table.Row key={`${r.inventory_item_id}:${r.location_id}`}>
                <Table.Cell>
                  <div className="flex flex-col">
                    <span>{r.title ?? "–"}</span>
                    <Text size="xsmall" className="text-ui-fg-muted">{r.sku ?? "bez SKU"}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>{r.location}</Table.Cell>
                <Table.Cell className="text-right">{r.stocked}</Table.Cell>
                <Table.Cell className="text-right">{r.reserved}</Table.Cell>
                <Table.Cell className="text-right">{r.available}</Table.Cell>
                <Table.Cell>
                  <ul className="flex flex-col gap-1 py-2">
                    {r.batches.map((b) => (
                      <li key={b.id} className="flex items-center gap-2">
                        <span>{b.lot_number ?? "bez numeru"}: {b.quantity} szt.</span>
                        <ExpiryBadge state={b.state} value={b.expiry_date} />
                      </li>
                    ))}
                    {r.untracked !== 0 && (
                      <li>
                        <Text size="small" className="text-ui-fg-muted">poza partiami: {r.untracked} szt.</Text>
                      </li>
                    )}
                  </ul>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

function ItemPicker({ value, onChange }: { value: InventoryItem | null; onChange: (item: InventoryItem | null) => void }) {
  const [q, setQ] = useState("")
  const { data } = useQuery({
    queryKey: ["patrix-inventory-items", q],
    queryFn: () => sdk.client.fetch<{ inventory_items: InventoryItem[] }>("/admin/inventory-items", { query: { q, limit: 20, fields: "id,sku,title" } }),
    enabled: q.trim().length >= 2 && !value,
  })
  if (value) {
    return (
      <div className="flex items-center gap-2">
        <Text>{value.title ?? "–"} ({value.sku ?? "bez SKU"})</Text>
        <Button type="button" size="small" variant="transparent" onClick={() => onChange(null)}>
          Zmień
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <Input id="movement-item" placeholder="Wpisz co najmniej 2 znaki SKU lub nazwy" value={q} onChange={(e) => setQ(e.target.value)} />
      {data && (
        <ul className="border-ui-border-base max-h-48 overflow-auto rounded-md border" aria-label="Wyniki wyszukiwania towaru">
          {data.inventory_items.length === 0 && (
            <li className="px-3 py-2">
              <Text size="small" className="text-ui-fg-subtle">Nic nie znaleziono.</Text>
            </li>
          )}
          {data.inventory_items.map((i) => (
            <li key={i.id}>
              <button type="button" className="hover:bg-ui-bg-base-hover w-full px-3 py-2 text-left" onClick={() => onChange(i)}>
                {i.title ?? "–"} <span className="text-ui-fg-muted">({i.sku ?? "bez SKU"})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MovementForm() {
  const queryClient = useQueryClient()
  const locations = useLocations()
  const [type, setType] = useState<"receipt" | "issue" | "adjustment" | "transfer">("receipt")
  const [locationId, setLocationId] = useState("")
  const [targetId, setTargetId] = useState("")
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [quantity, setQuantity] = useState("")
  const [lot, setLot] = useState("")
  const [expiry, setExpiry] = useState("")
  const [batchId, setBatchId] = useState("fefo")
  const [documentRef, setDocumentRef] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!locationId && locations.data?.length) {
      setLocationId(locations.data[0].id)
    }
  }, [locations.data, locationId])

  // Partie wybranego towaru do ręcznego wskazania przy wydaniu (domyślnie FEFO).
  const batches = useQuery({
    queryKey: ["patrix-warehouse-stock", locationId, item?.id],
    queryFn: () =>
      sdk.client.fetch<{ stock: StockRow[] }>("/admin/patrix/warehouse/stock", { query: { location_id: locationId, q: item?.sku ?? item?.title ?? "" } }),
    enabled: (type === "issue" || type === "transfer") && !!item && !!locationId,
    select: (d) => d.stock.find((r) => r.inventory_item_id === item?.id)?.batches ?? [],
  })

  const save = useMutation({
    mutationFn: () =>
      type === "transfer"
        ? sdk.client.fetch("/admin/patrix/warehouse/transfers", {
            method: "POST",
            body: {
              inventory_item_id: item!.id,
              from_location_id: locationId,
              to_location_id: targetId,
              quantity: Number(quantity),
              ...(batchId !== "fefo" ? { batch_id: batchId } : {}),
              ...(documentRef.trim() ? { document_ref: documentRef.trim() } : {}),
              ...(reason.trim() ? { reason: reason.trim() } : {}),
            },
          })
        : sdk.client.fetch("/admin/patrix/warehouse/movements", {
        method: "POST",
        body: {
          type,
          location_id: locationId,
          inventory_item_id: item!.id,
          quantity: Number(quantity),
          ...(type !== "issue" && lot.trim() ? { lot_number: lot.trim() } : {}),
          ...(type !== "issue" && expiry ? { expiry_date: expiry } : {}),
          ...(type === "issue" && batchId !== "fefo" ? { batch_id: batchId } : {}),
          ...(documentRef.trim() ? { document_ref: documentRef.trim() } : {}),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Zapisano ruch magazynowy")
      setQuantity("")
      setLot("")
      setExpiry("")
      setBatchId("fefo")
      setDocumentRef("")
      setReason("")
      queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-stock"] })
      queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-movements"] })
      queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-expiry"] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const qty = Number(quantity)
  const valid =
    !!item &&
    !!locationId &&
    Number.isInteger(qty) &&
    qty !== 0 &&
    (type === "adjustment" || qty > 0) &&
    (type !== "adjustment" || reason.trim().length > 0) &&
    (type !== "transfer" || (!!targetId && targetId !== locationId))

  return (
    <form
      className="border-ui-border-base flex flex-col gap-4 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) {
          save.mutate()
        }
      }}
    >
      <Heading level="h2">Nowy ruch</Heading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="movement-type">Rodzaj</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <Select.Trigger id="movement-type">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="receipt">Przyjęcie (PZ)</Select.Item>
              <Select.Item value="issue">Wydanie (WZ / RW)</Select.Item>
              <Select.Item value="adjustment">Korekta stanu</Select.Item>
              <Select.Item value="transfer">Przesunięcie między magazynami (MM)</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="movement-location">{type === "transfer" ? "Z lokalizacji" : "Lokalizacja"}</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <Select.Trigger id="movement-location">
              <Select.Value placeholder="Wybierz" />
            </Select.Trigger>
            <Select.Content>
              {locations.data?.map((l) => (
                <Select.Item key={l.id} value={l.id}>
                  {l.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="movement-qty">{type === "adjustment" ? "Zmiana ilości (np. -2 albo 3)" : "Ilość (szt.)"}</Label>
          <Input id="movement-qty" type="number" step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      </div>
      {type === "transfer" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="movement-target">Do lokalizacji</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <Select.Trigger id="movement-target">
              <Select.Value placeholder="Wybierz" />
            </Select.Trigger>
            <Select.Content>
              {locations.data
                ?.filter((l) => l.id !== locationId)
                .map((l) => (
                  <Select.Item key={l.id} value={l.id}>
                    {l.name}
                  </Select.Item>
                ))}
            </Select.Content>
          </Select>
          {locations.data && locations.data.length < 2 && (
            <Text size="small" className="text-ui-fg-subtle">Dodaj drugą lokalizację magazynową w ustawieniach panelu (lokalizacje i wysyłka), aby przesuwać towar.</Text>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="movement-item">Towar</Label>
        <ItemPicker value={item} onChange={setItem} />
      </div>
      {(type === "receipt" || type === "adjustment") && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="movement-lot">Numer partii (opcjonalnie)</Label>
            <Input id="movement-lot" value={lot} onChange={(e) => setLot(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="movement-expiry">Data ważności z opakowania (opcjonalnie)</Label>
            <Input id="movement-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        </div>
      )}
      {(type === "issue" || type === "transfer") && item && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="movement-batch">Partia</Label>
          <Select value={batchId} onValueChange={setBatchId}>
            <Select.Trigger id="movement-batch">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="fefo">Automatycznie (najkrótsza data ważności najpierw)</Select.Item>
              {batches.data?.map((b) => (
                <Select.Item key={b.id} value={b.id}>
                  {b.lot_number ?? "bez numeru"}, {b.quantity} szt., ważne do {date(b.expiry_date)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="movement-doc">Dokument (np. numer faktury dostawcy)</Label>
          <Input id="movement-doc" value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="movement-reason">{type === "adjustment" ? "Powód korekty (wymagany)" : "Uwagi"}</Label>
          <Input id="movement-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={!valid} isLoading={save.isPending}>
          Zapisz ruch
        </Button>
      </div>
    </form>
  )
}

const PAGE = 50

function MovementsTab() {
  const [type, setType] = useState(ALL)
  const [offset, setOffset] = useState(0)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const exportQuery = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...(type !== ALL ? { type } : {}) }).toString()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-warehouse-movements", type, offset],
    queryFn: () =>
      sdk.client.fetch<{ movements: Movement[]; count: number }>("/admin/patrix/warehouse/movements", {
        query: { limit: PAGE, offset, ...(type !== ALL ? { type } : {}) },
      }),
  })
  return (
    <div className="flex flex-col gap-6">
      <MovementForm />
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <Heading level="h2">Dziennik ruchów</Heading>
          <div className="flex flex-col gap-1">
            <Label htmlFor="movements-type">Rodzaj</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v)
                setOffset(0)
              }}
            >
              <Select.Trigger id="movements-type" className="w-48">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={ALL}>Wszystkie</Select.Item>
                {Object.entries(MOVEMENT_LABEL).map(([value, label]) => (
                  <Select.Item key={value} value={value}>
                    {label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="export-from">Eksport od</Label>
            <Input id="export-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="export-to">do</Label>
            <Input id="export-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button asChild variant="secondary">
            <a href={`/admin/patrix/warehouse/movements/export${exportQuery ? `?${exportQuery}` : ""}`} download>
              Pobierz CSV
            </a>
          </Button>
        </div>
        {isLoading && <Text>Wczytywanie…</Text>}
        {isError && <Text className="text-ui-fg-error">Nie udało się wczytać dziennika.</Text>}
        {data && data.movements.length === 0 && <Text className="text-ui-fg-subtle">Brak ruchów.</Text>}
        {data && data.movements.length > 0 && (
          <>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Data</Table.HeaderCell>
                  <Table.HeaderCell>Rodzaj</Table.HeaderCell>
                  <Table.HeaderCell>Towar</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Ilość</Table.HeaderCell>
                  <Table.HeaderCell>Partia</Table.HeaderCell>
                  <Table.HeaderCell>Dokument / powód</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.movements.map((m) => (
                  <Table.Row key={m.id}>
                    <Table.Cell>{dateTime(m.created_at)}</Table.Cell>
                    <Table.Cell>{MOVEMENT_LABEL[m.type]}</Table.Cell>
                    <Table.Cell>
                      {m.item?.title ?? "–"} <span className="text-ui-fg-muted">({m.item?.sku ?? "bez SKU"})</span>
                    </Table.Cell>
                    <Table.Cell className="text-right">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Table.Cell>
                    <Table.Cell>{m.batch ? `${m.batch.lot_number ?? "bez numeru"} (${date(m.batch.expiry_date)})` : "–"}</Table.Cell>
                    <Table.Cell>{[m.document_ref, m.reason].filter(Boolean).join(" · ") || "–"}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                {offset + 1}–{offset + data.movements.length} z {data.count}
              </Text>
              <div className="flex gap-2">
                <Button size="small" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(offset - PAGE, 0))}>
                  Poprzednie
                </Button>
                <Button size="small" variant="secondary" disabled={offset + PAGE >= data.count} onClick={() => setOffset(offset + PAGE)}>
                  Następne
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ExpiryTab() {
  const [days, setDays] = useState("30")
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-warehouse-expiry", days],
    queryFn: () => sdk.client.fetch<{ batches: ExpiryBatch[] }>("/admin/patrix/warehouse/batches", { query: { days } }),
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="expiry-days">Pokaż partie z datą ważności w ciągu</Label>
        <Select value={days} onValueChange={setDays}>
          <Select.Trigger id="expiry-days" className="w-40">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="7">7 dni</Select.Item>
            <Select.Item value="30">30 dni</Select.Item>
            <Select.Item value="90">90 dni</Select.Item>
          </Select.Content>
        </Select>
      </div>
      {isLoading && <Text>Wczytywanie…</Text>}
      {isError && <Text className="text-ui-fg-error">Nie udało się wczytać raportu.</Text>}
      {data && data.batches.length === 0 && <Text className="text-ui-fg-subtle">Brak partii, którym kończy się termin w tym okresie.</Text>}
      {data && data.batches.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Data ważności</Table.HeaderCell>
              <Table.HeaderCell>Towar</Table.HeaderCell>
              <Table.HeaderCell>Partia</Table.HeaderCell>
              <Table.HeaderCell>Lokalizacja</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Ilość</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.batches.map((b) => (
              <Table.Row key={b.id}>
                <Table.Cell>
                  <ExpiryBadge state={b.state} value={b.expiry_date} />
                </Table.Cell>
                <Table.Cell>
                  {b.item?.title ?? "–"} <span className="text-ui-fg-muted">({b.item?.sku ?? "bez SKU"})</span>
                </Table.Cell>
                <Table.Cell>{b.lot_number ?? "bez numeru"}</Table.Cell>
                <Table.Cell>{b.location}</Table.Cell>
                <Table.Cell className="text-right">{b.quantity}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

function CountSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const { data, isLoading } = useQuery({
    queryKey: ["patrix-warehouse-count", id],
    queryFn: () => sdk.client.fetch<{ count: StockCount & { location: string }; lines: CountLine[] }>(`/admin/patrix/warehouse/counts/${id}`),
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-count", id] })
    queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-counts"] })
    queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-stock"] })
    queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-movements"] })
  }
  const changed = Object.entries(edits).map(([lineId, v]) => ({ id: lineId, counted: v.trim() === "" ? null : Number(v) }))
  const invalid = changed.some((l) => l.counted !== null && (!Number.isInteger(l.counted) || l.counted < 0))
  const save = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/patrix/warehouse/counts/${id}/lines`, { method: "POST", body: { lines: changed } }),
    onSuccess: () => {
      toast.success("Zapisano wyniki spisu")
      setEdits({})
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const close = useMutation({
    mutationFn: () => sdk.client.fetch<{ adjusted: number; not_counted: number }>(`/admin/patrix/warehouse/counts/${id}/close`, { method: "POST" }),
    onSuccess: (r) => {
      toast.success(`Zatwierdzono. Korekty: ${r.adjusted}, nieprzeliczone pozycje: ${r.not_counted}`)
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const cancel = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/patrix/warehouse/counts/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Anulowano inwentaryzację")
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (isLoading || !data) {
    return <Text>Wczytywanie…</Text>
  }
  const open = data.count.status === "open"
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Heading level="h2">Arkusz spisu: {data.count.location}</Heading>
          <Badge size="2xsmall" color={COUNT_STATUS[data.count.status].color}>
            {COUNT_STATUS[data.count.status].text}
          </Badge>
        </div>
        <Button size="small" variant="transparent" onClick={onClose}>
          Wróć do listy
        </Button>
      </div>
      {data.count.note && <Text className="text-ui-fg-subtle">{data.count.note}</Text>}
      {open && (
        <Text size="small" className="text-ui-fg-subtle">
          Wpisz policzone ilości i zapisz. Puste pole oznacza pozycję nieprzeliczoną: przy zatwierdzeniu jej stan się nie zmienia. Różnice liczymy względem
          stanu w chwili zatwierdzenia.
        </Text>
      )}
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Towar</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Stan obecny</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Policzono</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Różnica</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.lines.map((l) => (
            <Table.Row key={l.id}>
              <Table.Cell>
                {l.title ?? "–"} <span className="text-ui-fg-muted">({l.sku ?? "bez SKU"})</span>
              </Table.Cell>
              <Table.Cell className="text-right">{open ? l.current : l.expected}</Table.Cell>
              <Table.Cell className="text-right">
                {open ? (
                  <Input
                    aria-label={`Policzono: ${l.title ?? l.sku ?? l.id}`}
                    type="number"
                    min={0}
                    step={1}
                    className="ml-auto w-24"
                    value={edits[l.id] ?? (l.counted === null ? "" : String(l.counted))}
                    onChange={(e) => setEdits({ ...edits, [l.id]: e.target.value })}
                  />
                ) : (
                  (l.counted ?? "–")
                )}
              </Table.Cell>
              <Table.Cell className="text-right">{l.difference === null ? "–" : l.difference > 0 ? `+${l.difference}` : l.difference}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {open && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={changed.length === 0 || invalid} isLoading={save.isPending} onClick={() => save.mutate()}>
            Zapisz wyniki
          </Button>
          <Button
            variant="secondary"
            disabled={changed.length > 0}
            isLoading={close.isPending}
            onClick={async () => {
              const ok = await prompt({
                title: "Zatwierdzić inwentaryzację?",
                description: "Stany przeliczonych pozycji zostaną ustawione na policzone ilości, a różnice trafią do dziennika ruchów. Tej operacji nie można cofnąć.",
                confirmText: "Zatwierdź",
                cancelText: "Anuluj",
              })
              if (ok) {
                close.mutate()
              }
            }}
          >
            Zatwierdź i zaksięguj różnice
          </Button>
          <Button
            variant="danger"
            isLoading={cancel.isPending}
            onClick={async () => {
              const ok = await prompt({
                title: "Anulować inwentaryzację?",
                description: "Wpisane ilości nie zmienią stanów.",
                confirmText: "Anuluj inwentaryzację",
                cancelText: "Wróć",
              })
              if (ok) {
                cancel.mutate()
              }
            }}
          >
            Anuluj inwentaryzację
          </Button>
          {changed.length > 0 && (
            <Text size="small" className="text-ui-fg-subtle self-center">
              Zapisz wyniki przed zatwierdzeniem.
            </Text>
          )}
        </div>
      )}
    </div>
  )
}

function CountsTab() {
  const queryClient = useQueryClient()
  const locations = useLocations()
  const [selected, setSelected] = useState<string | null>(null)
  const [locationId, setLocationId] = useState("")
  const [note, setNote] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["patrix-warehouse-counts"],
    queryFn: () => sdk.client.fetch<{ counts: StockCount[] }>("/admin/patrix/warehouse/counts"),
  })
  const create = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ count: StockCount; lines: number }>("/admin/patrix/warehouse/counts", {
        method: "POST",
        body: { location_id: locationId, ...(note.trim() ? { note: note.trim() } : {}) },
      }),
    onSuccess: (r) => {
      toast.success(`Otwarto inwentaryzację (${r.lines} pozycji)`)
      setNote("")
      queryClient.invalidateQueries({ queryKey: ["patrix-warehouse-counts"] })
      setSelected(r.count.id)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (selected) {
    return <CountSheet id={selected} onClose={() => setSelected(null)} />
  }
  const locationName = (id: string) => locations.data?.find((l) => l.id === id)?.name ?? id
  return (
    <div className="flex flex-col gap-6">
      <form
        className="border-ui-border-base flex flex-wrap items-end gap-3 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (locationId) {
            create.mutate()
          }
        }}
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="count-location">Lokalizacja</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <Select.Trigger id="count-location" className="w-56">
              <Select.Value placeholder="Wybierz" />
            </Select.Trigger>
            <Select.Content>
              {locations.data?.map((l) => (
                <Select.Item key={l.id} value={l.id}>
                  {l.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="count-note">Uwagi (opcjonalnie)</Label>
          <Input id="count-note" value={note} onChange={(e) => setNote(e.target.value)} className="w-72" />
        </div>
        <Button type="submit" disabled={!locationId} isLoading={create.isPending}>
          Rozpocznij inwentaryzację
        </Button>
      </form>
      {isLoading && <Text>Wczytywanie…</Text>}
      {data && data.counts.length === 0 && <Text className="text-ui-fg-subtle">Nie było jeszcze inwentaryzacji.</Text>}
      {data && data.counts.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Rozpoczęta</Table.HeaderCell>
              <Table.HeaderCell>Lokalizacja</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Uwagi</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.counts.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell>{dateTime(c.created_at)}</Table.Cell>
                <Table.Cell>{locationName(c.location_id)}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={COUNT_STATUS[c.status].color}>
                    {COUNT_STATUS[c.status].text}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{c.note ?? "–"}</Table.Cell>
                <Table.Cell className="text-right">
                  <Button size="small" variant="secondary" onClick={() => setSelected(c.id)}>
                    {c.status === "open" ? "Otwórz arkusz" : "Pokaż"}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

type ValueRow = { inventory_item_id: string; sku: string | null; title: string | null; location: string; quantity: number; unit_cost: number | null; value: number | null }
const money = (n: number) => n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })

function ValueTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["patrix-warehouse-value"],
    queryFn: () => sdk.client.fetch<{ total_value: number; missing_cost: number; rows: ValueRow[] }>("/admin/patrix/warehouse/value"),
    retry: false,
  })
  if (isLoading) {
    return <Text>Wczytywanie…</Text>
  }
  if (error) {
    const status = (error as { status?: number }).status
    return <Text className="text-ui-fg-subtle">{status === 403 ? "Wartość magazynu widzą tylko osoby z uprawnieniem do finansów." : "Nie udało się wczytać raportu."}</Text>
  }
  if (!data) {
    return null
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Heading level="h2">Wartość w cenach zakupu netto: {money(data.total_value)}</Heading>
        {data.missing_cost > 0 && (
          <Text size="small" className="text-ui-fg-subtle">
            Pozycje bez ceny zakupu: {data.missing_cost}. Nie są wliczone; uzupełnij ceny zakupu na karcie produktu albo importem.
          </Text>
        )}
      </div>
      {data.rows.length === 0 && <Text className="text-ui-fg-subtle">Magazyn jest pusty.</Text>}
      {data.rows.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Towar</Table.HeaderCell>
              <Table.HeaderCell>Lokalizacja</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Ilość</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Cena zakupu</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Wartość</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.rows.map((r) => (
              <Table.Row key={`${r.inventory_item_id}:${r.location}`}>
                <Table.Cell>
                  {r.title ?? "–"} <span className="text-ui-fg-muted">({r.sku ?? "bez SKU"})</span>
                </Table.Cell>
                <Table.Cell>{r.location}</Table.Cell>
                <Table.Cell className="text-right">{r.quantity}</Table.Cell>
                <Table.Cell className="text-right">{r.unit_cost === null ? "brak ceny" : money(r.unit_cost)}</Table.Cell>
                <Table.Cell className="text-right">{r.value === null ? "–" : money(r.value)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

const WarehousePage = () => (
  <Container className="flex flex-col gap-4 p-6">
    <div>
      <Heading level="h1">Magazyn</Heading>
      <Text className="text-ui-fg-subtle">
        Przyjęcia, wydania i korekty zapisujemy tutaj, żeby każda zmiana stanu miała wpis w dzienniku i partię z datą ważności. Sprzedaż zdejmuje towar z
        partii automatycznie przy wysyłce (najkrótsza data ważności najpierw).
      </Text>
    </div>
    <Tabs defaultValue="stock">
      <Tabs.List>
        <Tabs.Trigger value="stock">Stany</Tabs.Trigger>
        <Tabs.Trigger value="movements">Ruchy</Tabs.Trigger>
        <Tabs.Trigger value="expiry">Daty ważności</Tabs.Trigger>
        <Tabs.Trigger value="counts">Inwentaryzacja</Tabs.Trigger>
        <Tabs.Trigger value="value">Wartość</Tabs.Trigger>
      </Tabs.List>
      <div className="pt-4">
        <Tabs.Content value="stock">
          <StockTab />
        </Tabs.Content>
        <Tabs.Content value="movements">
          <MovementsTab />
        </Tabs.Content>
        <Tabs.Content value="expiry">
          <ExpiryTab />
        </Tabs.Content>
        <Tabs.Content value="counts">
          <CountsTab />
        </Tabs.Content>
        <Tabs.Content value="value">
          <ValueTab />
        </Tabs.Content>
      </div>
    </Tabs>
  </Container>
)

export const config = defineRouteConfig({ label: "Magazyn", icon: Buildings })

export default WarehousePage
