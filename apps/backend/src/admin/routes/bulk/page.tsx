import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUpTray } from "@medusajs/icons"
import { Badge, Button, Checkbox, Container, Heading, Input, Label, Select, Table, Text, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type ImportKind = "compliance" | "costs"
type ImportRow = { line: number; handle?: string; sku?: string; status: "create" | "update" | "unchanged" | "error"; changed?: string[]; errors: string[] }
type ImportResult = { applied: boolean; summary: { rows: number; create: number; update: number; unchanged: number; errors: number }; rows: ImportRow[] }

// Tylko nagłówki: wzór nie zawiera przykładowych danych produktów.
const TEMPLATES: Record<ImportKind, { label: string; columns: string[]; help: string }> = {
  compliance: {
    label: "Dane produktów (producent, skład, ilość, marka)",
    columns: [
      "uchwyt",
      "rodzaj",
      "marka",
      "nazwa_oryginalna",
      "producent",
      "adres_producenta",
      "kontakt_producenta",
      "producent_w_ue",
      "podmiot_odpowiedzialny_ue",
      "adres_podmiotu_ue",
      "kraj_pochodzenia",
      "ilosc_netto",
      "jednostka",
      "sklad",
      "alergeny",
      "przechowywanie",
      "sposob_uzycia",
      "ostrzezenia",
      "ufi",
      "pao_miesiace",
      "funkcja_kosmetyku",
    ],
    help: "Produkt wskazuje kolumna uchwyt. Pusta komórka nie zmienia danych. rodzaj: ogólny, żywność, chemia, kosmetyk; marka: identyfikator marki; producent_w_ue: tak/nie; jednostka: g, kg, ml, l, szt, pranie; alergeny rozdziel znakiem |. Import nie potwierdza etykiety ani alergenów: zrób to na karcie produktu. Dane CLP i wartości odżywcze uzupełnia się na karcie produktu. Produktów opublikowanych import nie zmienia.",
  },
  costs: {
    label: "Ceny zakupu (netto, po SKU)",
    columns: ["sku", "cena_zakupu", "dostawca"],
    help: "cena_zakupu: kwota netto w zł, np. 12,50. Wymaga uprawnienia do finansów.",
  },
}

const STATUS_LABEL: Record<ImportRow["status"], { text: string; color: "green" | "blue" | "grey" | "red" }> = {
  create: { text: "nowe dane", color: "green" },
  update: { text: "zmiana", color: "blue" },
  unchanged: { text: "bez zmian", color: "grey" },
  error: { text: "błąd", color: "red" },
}

/** Pliki z polskiego Excela bywają w Windows-1250, a nie UTF-8. */
async function readCsv(file: File) {
  const buffer = await file.arrayBuffer()
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder("windows-1250").decode(buffer)
  }
}

function ImportSection() {
  const [kind, setKind] = useState<ImportKind>("compliance")
  const [csv, setCsv] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const prompt = usePrompt()
  const run = useMutation({
    mutationFn: (dry_run: boolean) => sdk.client.fetch<ImportResult>(`/admin/patrix/import/${kind}`, { method: "POST", body: { csv, dry_run } }),
    onSuccess: (data) => {
      setResult(data)
      if (data.applied) {
        toast.success(`Zapisano: nowe ${data.summary.create}, zmienione ${data.summary.update}`)
        setCsv(null)
        setFileName("")
      }
    },
    onError: (e: Error) => {
      setResult(null)
      toast.error(e.message)
    },
  })
  const template = TEMPLATES[kind]
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${template.columns.join(";")}\r\n`)}`
  const canApply = !!result && !result.applied && result.summary.errors === 0 && result.summary.create + result.summary.update > 0

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-4">
      <div>
        <Heading level="h2">Import z pliku CSV</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Najpierw sprawdź plik: zobaczysz, co się zmieni. Zapis następuje tylko wtedy, gdy cały plik jest poprawny. Produkty, warianty i ceny sprzedaży importujesz we wbudowanym imporcie Medusy (Produkty → Importuj).
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="import-kind" size="small" weight="plus">
            Rodzaj importu
          </Label>
          <Select
            value={kind}
            onValueChange={(v) => {
              setKind(v as ImportKind)
              setResult(null)
            }}
          >
            <Select.Trigger id="import-kind">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {(Object.keys(TEMPLATES) as ImportKind[]).map((k) => (
                <Select.Item key={k} value={k}>
                  {TEMPLATES[k].label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="import-file" size="small" weight="plus">
            Plik CSV (separator ; lub ,)
          </Label>
          <Input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              setResult(null)
              if (!file) {
                setCsv(null)
                return
              }
              if (file.size > 2_000_000) {
                toast.error("Plik jest większy niż 2 MB. Podziel go na mniejsze części.")
                return
              }
              setFileName(file.name)
              setCsv(await readCsv(file))
            }}
          />
        </div>
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        {template.help}{" "}
        <a href={templateHref} download={`wzor-${kind}.csv`} className="text-ui-fg-interactive">
          Pobierz wzór (same nagłówki)
        </a>
      </Text>
      <div className="flex flex-wrap gap-2">
        <Button size="small" variant="secondary" disabled={!csv} isLoading={run.isPending && run.variables === true} onClick={() => run.mutate(true)}>
          Sprawdź plik
        </Button>
        <Button
          size="small"
          disabled={!canApply}
          isLoading={run.isPending && run.variables === false}
          onClick={async () => {
            if (await prompt({ title: "Zapisać zmiany z pliku?", description: `${fileName}: nowe ${result!.summary.create}, zmienione ${result!.summary.update}.`, confirmText: "Zapisz", cancelText: "Anuluj" })) {
              run.mutate(false)
            }
          }}
        >
          Zapisz zmiany
        </Button>
      </div>

      {result ? (
        <div className="flex flex-col gap-y-2" aria-live="polite">
          <Text size="small" weight="plus">
            {result.applied ? "Zapisano. " : "Wynik sprawdzenia: "}
            wierszy {result.summary.rows}, nowe {result.summary.create}, zmiany {result.summary.update}, bez zmian {result.summary.unchanged}, błędy {result.summary.errors}
          </Text>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Wiersz</Table.HeaderCell>
                <Table.HeaderCell>{kind === "costs" ? "SKU" : "Uchwyt"}</Table.HeaderCell>
                <Table.HeaderCell>Wynik</Table.HeaderCell>
                <Table.HeaderCell>Szczegóły</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {result.rows.map((r) => (
                <Table.Row key={r.line}>
                  <Table.Cell>{r.line}</Table.Cell>
                  <Table.Cell>{r.sku ?? r.handle}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={STATUS_LABEL[r.status].color}>
                      {STATUS_LABEL[r.status].text}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="whitespace-normal">{r.errors.length ? r.errors.join("; ") : (r.changed ?? []).join(", ")}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      ) : null}
    </Container>
  )
}

type Product = { id: string; title: string; handle: string; status: string }
type BulkAction = "publish" | "draft" | "brand" | "category_add" | "category_remove"
const ACTIONS: Record<BulkAction, string> = {
  publish: "Opublikuj (tylko produkty z kompletnymi danymi)",
  draft: "Wycofaj do szkicu",
  brand: "Ustaw markę",
  category_add: "Dodaj do kategorii",
  category_remove: "Usuń z kategorii",
}
const STATUS_PL: Record<string, string> = { published: "opublikowany", draft: "szkic", proposed: "propozycja", rejected: "odrzucony" }

function BulkSection() {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<string[]>([])
  const [action, setAction] = useState<BulkAction>("publish")
  const [value, setValue] = useState("")
  const [results, setResults] = useState<{ id: string; title: string; ok: boolean; error?: string }[] | null>(null)

  const products = useQuery({
    queryKey: ["patrix-bulk-products", q, status],
    queryFn: () =>
      sdk.client.fetch<{ products: Product[]; count: number }>("/admin/products", {
        query: { fields: "id,title,handle,status", limit: 100, order: "title", ...(q ? { q } : {}), ...(status !== "all" ? { status: [status] } : {}) },
      }),
  })
  const brands = useQuery({ queryKey: ["patrix-brands"], queryFn: () => sdk.client.fetch<{ brands: { id: string; name: string }[] }>("/admin/patrix/brands") })
  const categories = useQuery({
    queryKey: ["patrix-bulk-categories"],
    queryFn: () => sdk.client.fetch<{ product_categories: { id: string; name: string }[] }>("/admin/product-categories", { query: { fields: "id,name", limit: 500 } }),
  })
  const run = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ results: typeof results; summary: { ok: number; failed: number } }>("/admin/patrix/products/bulk", {
        method: "POST",
        body: { product_ids: selected, action, value: action === "brand" ? value || null : action.startsWith("category") ? value : undefined },
      }),
    onSuccess: (data) => {
      setResults(data.results)
      queryClient.invalidateQueries({ queryKey: ["patrix-bulk-products"] })
      data.summary.failed ? toast.warning(`Zmieniono ${data.summary.ok}, nie udało się: ${data.summary.failed}`) : toast.success(`Zmieniono ${data.summary.ok}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const list = products.data?.products ?? []
  const allOnPage = list.length > 0 && list.every((p) => selected.includes(p.id))
  const needsCategory = action === "category_add" || action === "category_remove"
  const options = action === "brand" ? brands.data?.brands ?? [] : categories.data?.product_categories ?? []

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-4">
      <div>
        <Heading level="h2">Zmiany masowe</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Zaznacz produkty i wybierz zmianę. Każdy produkt jest zmieniany osobno: publikacja produktu z niekompletnymi danymi zostanie odrzucona, pozostałe zmiany przejdą.
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem]">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="bulk-q" size="small" weight="plus">
            Szukaj produktów
          </Label>
          <Input id="bulk-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="bulk-status" size="small" weight="plus">
            Status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger id="bulk-status">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">Wszystkie</Select.Item>
              <Select.Item value="published">Opublikowane</Select.Item>
              <Select.Item value="draft">Szkice</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="w-10">
              <Checkbox
                aria-label="Zaznacz wszystkie na liście"
                checked={allOnPage}
                onCheckedChange={(v) => setSelected(v === true ? [...new Set([...selected, ...list.map((p) => p.id)])] : selected.filter((id) => !list.some((p) => p.id === id)))}
              />
            </Table.HeaderCell>
            <Table.HeaderCell>Produkt</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {list.map((p) => (
            <Table.Row key={p.id}>
              <Table.Cell>
                <Checkbox
                  aria-label={`Zaznacz: ${p.title}`}
                  checked={selected.includes(p.id)}
                  onCheckedChange={(v) => setSelected((s) => (v === true ? [...s, p.id] : s.filter((id) => id !== p.id)))}
                />
              </Table.Cell>
              <Table.Cell>{p.title}</Table.Cell>
              <Table.Cell>{STATUS_PL[p.status] ?? p.status}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {products.data && products.data.count > list.length ? (
        <Text size="small" className="text-ui-fg-subtle">
          Pokazano {list.length} z {products.data.count}. Zawęź wyszukiwanie, aby zobaczyć pozostałe.
        </Text>
      ) : null}

      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="bulk-action" size="small" weight="plus">
            Zmiana
          </Label>
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v as BulkAction)
              setValue("")
            }}
          >
            <Select.Trigger id="bulk-action">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {(Object.keys(ACTIONS) as BulkAction[]).map((a) => (
                <Select.Item key={a} value={a}>
                  {ACTIONS[a]}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        {action === "brand" || needsCategory ? (
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="bulk-value" size="small" weight="plus">
              {action === "brand" ? "Marka (puste = usuń markę)" : "Kategoria"}
            </Label>
            <Select value={value || "none"} onValueChange={(v) => setValue(v === "none" ? "" : v)}>
              <Select.Trigger id="bulk-value">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">{action === "brand" ? "Bez marki" : "Wybierz…"}</Select.Item>
                {options.map((o) => (
                  <Select.Item key={o.id} value={o.id}>
                    {o.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        ) : (
          <div />
        )}
        <Button
          size="small"
          disabled={!selected.length || (needsCategory && !value)}
          isLoading={run.isPending}
          onClick={async () => {
            if (await prompt({ title: "Wykonać zmianę masową?", description: `${ACTIONS[action]}: ${selected.length} produktów.`, confirmText: "Wykonaj", cancelText: "Anuluj" })) {
              run.mutate()
            }
          }}
        >
          Zastosuj do zaznaczonych ({selected.length})
        </Button>
      </div>

      {results ? (
        <ul className="flex flex-col gap-y-1" aria-label="Wynik zmiany masowej" aria-live="polite">
          {results.map((r) => (
            <li key={r.id} className="flex flex-wrap gap-2">
              <Badge size="2xsmall" color={r.ok ? "green" : "red"}>
                {r.ok ? "zmieniono" : "nie zmieniono"}
              </Badge>
              <Text size="small">
                {r.title}
                {r.error ? `: ${r.error}` : ""}
              </Text>
            </li>
          ))}
        </ul>
      ) : null}
    </Container>
  )
}

const BulkPage = () => (
  <div className="flex flex-col gap-y-3">
    <Container className="px-6 py-4">
      <Heading level="h1">Import i zmiany masowe</Heading>
    </Container>
    <ImportSection />
    <BulkSection />
  </div>
)

export const config = defineRouteConfig({ label: "Import i zmiany masowe", icon: ArrowUpTray })

export default BulkPage
