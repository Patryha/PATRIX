import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Puzzle } from "@medusajs/icons"
import { Badge, Button, Checkbox, Container, Heading, Input, Label, Select, Table, Tabs, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Category = "payment" | "shipping" | "accounting" | "marketplace" | "email"
type Integration = {
  id: string
  name: string
  category: Category
  available: boolean
  fields: { key: string; label: string; secret: boolean }[]
  can_test: boolean
  webhook_path: string | null
  connection: {
    mode: "sandbox" | "production"
    enabled: boolean
    hints: Record<string, string>
    last_test_at: string | null
    last_test_ok: boolean | null
    last_test_message: string | null
  } | null
}
type Webhook = {
  id: string
  adapter: string
  external_id: string
  event_type: string | null
  status: "received" | "processed" | "failed" | "dead" | "ignored"
  attempts: number
  next_attempt_at: string | null
  last_error: string | null
  created_at: string
}
type Log = { id: string; adapter: string; operation: string; direction: "outbound" | "inbound"; ok: boolean; duration_ms: number | null; message: string | null; reference: string | null; created_at: string }

const CATEGORY_LABEL: Record<Category, string> = {
  payment: "Płatności",
  shipping: "Dostawy",
  accounting: "Księgowość i faktury",
  marketplace: "Sprzedaż w innych kanałach",
  email: "E-maile",
}
const WEBHOOK_STATUS: Record<Webhook["status"], { text: string; color: "green" | "blue" | "orange" | "red" | "grey" }> = {
  received: { text: "przyjęte", color: "blue" },
  processed: { text: "obsłużone", color: "green" },
  failed: { text: "ponowienie zaplanowane", color: "orange" },
  dead: { text: "wymaga reakcji", color: "red" },
  ignored: { text: "pominięte", color: "grey" },
}
const ALL = "__all"
const dateTime = (d: string) => new Date(d).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Nie udało się zapisać.")

function StatusBadge({ integration }: { integration: Integration }) {
  if (!integration.available) {
    return <Badge size="2xsmall" color="grey">w przygotowaniu</Badge>
  }
  if (!integration.connection?.enabled) {
    return <Badge size="2xsmall" color="orange">niepodłączona</Badge>
  }
  return (
    <Badge size="2xsmall" color={integration.connection.mode === "production" ? "green" : "blue"}>
      włączona ({integration.connection.mode === "production" ? "produkcja" : "tryb testowy"})
    </Badge>
  )
}

function ConnectionForm({ integration, productionAllowed }: { integration: Integration; productionAllowed: boolean }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [mode, setMode] = useState(integration.connection?.mode ?? "sandbox")
  const [enabled, setEnabled] = useState(integration.connection?.enabled ?? false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["patrix-integrations"] })
  const save = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/patrix/integrations/${integration.id}`, { method: "POST", body: { credentials: values, mode, enabled } }),
    onSuccess: () => {
      toast.success("Zapisano połączenie")
      setValues({})
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const test = useMutation({
    mutationFn: () => sdk.client.fetch<{ ok: boolean; message: string }>(`/admin/patrix/integrations/${integration.id}/test`, { method: "POST" }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(r.message)
      } else {
        toast.error(r.message)
      }
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const hints = integration.connection?.hints ?? {}
  return (
    <form
      className="flex flex-col gap-3 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {integration.fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <Label htmlFor={`${integration.id}-${f.key}`}>{f.label}</Label>
            <Input
              id={`${integration.id}-${f.key}`}
              type={f.secret ? "password" : "text"}
              autoComplete="off"
              placeholder={hints[f.key] ? (f.secret ? `zapisany: ${hints[f.key]} (puste = bez zmiany)` : hints[f.key]) : ""}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${integration.id}-mode`}>Tryb</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <Select.Trigger id={`${integration.id}-mode`}>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="sandbox">Testowy (sandbox)</Select.Item>
              {productionAllowed && <Select.Item value="production">Produkcyjny</Select.Item>}
            </Select.Content>
          </Select>
          {!productionAllowed && (
            <Text size="small" className="text-ui-fg-subtle">Tryb produkcyjny włącza właściciel w konfiguracji serwera.</Text>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={`${integration.id}-enabled`} checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
        <Label htmlFor={`${integration.id}-enabled`}>Włączona</Label>
      </div>
      {integration.webhook_path && (
        <Text size="small" className="text-ui-fg-subtle">
          Adres powiadomień do wpisania u operatora: {window.location.origin}
          {integration.webhook_path}
        </Text>
      )}
      {integration.connection?.last_test_at && (
        <Text size="small" className={integration.connection.last_test_ok ? "text-ui-fg-subtle" : "text-ui-fg-error"}>
          Ostatni test ({dateTime(integration.connection.last_test_at)}): {integration.connection.last_test_message}
        </Text>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="small" isLoading={save.isPending}>
          Zapisz
        </Button>
        {integration.can_test && integration.connection && (
          <Button type="button" size="small" variant="secondary" isLoading={test.isPending} onClick={() => test.mutate()}>
            Sprawdź połączenie
          </Button>
        )}
      </div>
    </form>
  )
}

function ConnectionsTab() {
  const [open, setOpen] = useState<string | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patrix-integrations"],
    queryFn: () => sdk.client.fetch<{ production_allowed: boolean; integrations: Integration[] }>("/admin/patrix/integrations"),
  })
  if (isLoading) {
    return <Text>Wczytywanie…</Text>
  }
  if (isError || !data) {
    return <Text className="text-ui-fg-error">Nie udało się wczytać integracji.</Text>
  }
  const categories = [...new Set(data.integrations.map((i) => i.category))]
  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => (
        <section key={category} className="flex flex-col gap-2" aria-labelledby={`cat-${category}`}>
          <Heading level="h2" id={`cat-${category}`}>
            {CATEGORY_LABEL[category]}
          </Heading>
          <ul className="divide-ui-border-base border-ui-border-base divide-y rounded-lg border">
            {data.integrations
              .filter((i) => i.category === category)
              .map((i) => (
                <li key={i.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Text weight="plus">{i.name}</Text>
                      <StatusBadge integration={i} />
                    </div>
                    {i.available ? (
                      <Button size="small" variant="secondary" aria-expanded={open === i.id} onClick={() => setOpen(open === i.id ? null : i.id)}>
                        {open === i.id ? "Zwiń" : "Ustawienia"}
                      </Button>
                    ) : (
                      <Text size="small" className="text-ui-fg-subtle">
                        Wymaga adaptera i konta testowego operatora
                      </Text>
                    )}
                  </div>
                  {open === i.id && <ConnectionForm integration={i} productionAllowed={data.production_allowed} />}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

const PAGE = 50

function WebhooksTab() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(ALL)
  const [offset, setOffset] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ["patrix-integration-webhooks", status, offset],
    queryFn: () =>
      sdk.client.fetch<{ webhooks: Webhook[]; count: number }>("/admin/patrix/integrations/webhooks", {
        query: { limit: PAGE, offset, ...(status !== ALL ? { status } : {}) },
      }),
  })
  const retry = useMutation({
    mutationFn: (id: string) => sdk.client.fetch<{ status: Webhook["status"] }>(`/admin/patrix/integrations/webhooks/${id}/retry`, { method: "POST" }),
    onSuccess: (r) => {
      toast.success(`Wynik: ${WEBHOOK_STATUS[r.status].text}`)
      queryClient.invalidateQueries({ queryKey: ["patrix-integration-webhooks"] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="webhook-status">Status</Label>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setOffset(0)
          }}
        >
          <Select.Trigger id="webhook-status" className="w-56">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={ALL}>Wszystkie</Select.Item>
            {Object.entries(WEBHOOK_STATUS).map(([value, s]) => (
              <Select.Item key={value} value={value}>
                {s.text}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      {isLoading && <Text>Wczytywanie…</Text>}
      {data && data.webhooks.length === 0 && <Text className="text-ui-fg-subtle">Brak zdarzeń od operatorów.</Text>}
      {data && data.webhooks.length > 0 && (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Otrzymano</Table.HeaderCell>
                <Table.HeaderCell>Integracja</Table.HeaderCell>
                <Table.HeaderCell>Zdarzenie</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Próby</Table.HeaderCell>
                <Table.HeaderCell>Błąd</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.webhooks.map((w) => (
                <Table.Row key={w.id}>
                  <Table.Cell>{dateTime(w.created_at)}</Table.Cell>
                  <Table.Cell>{w.adapter}</Table.Cell>
                  <Table.Cell>
                    {w.event_type ?? "–"} <span className="text-ui-fg-muted">({w.external_id})</span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={WEBHOOK_STATUS[w.status].color}>
                      {WEBHOOK_STATUS[w.status].text}
                    </Badge>
                    {w.status === "failed" && w.next_attempt_at && (
                      <Text size="xsmall" className="text-ui-fg-muted">
                        następna próba {dateTime(w.next_attempt_at)}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>{w.attempts}</Table.Cell>
                  <Table.Cell>{w.last_error ?? "–"}</Table.Cell>
                  <Table.Cell className="text-right">
                    {(w.status === "failed" || w.status === "dead") && (
                      <Button size="small" variant="secondary" isLoading={retry.isPending && retry.variables === w.id} onClick={() => retry.mutate(w.id)}>
                        Ponów teraz
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <Pager offset={offset} count={data.count} shown={data.webhooks.length} onChange={setOffset} />
        </>
      )}
    </div>
  )
}

function Pager({ offset, count, shown, onChange }: { offset: number; count: number; shown: number; onChange: (offset: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Text size="small" className="text-ui-fg-subtle">
        {offset + 1}–{offset + shown} z {count}
      </Text>
      <div className="flex gap-2">
        <Button size="small" variant="secondary" disabled={offset === 0} onClick={() => onChange(Math.max(offset - PAGE, 0))}>
          Poprzednie
        </Button>
        <Button size="small" variant="secondary" disabled={offset + PAGE >= count} onClick={() => onChange(offset + PAGE)}>
          Następne
        </Button>
      </div>
    </div>
  )
}

function LogsTab() {
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [offset, setOffset] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ["patrix-integration-logs", onlyErrors, offset],
    queryFn: () =>
      sdk.client.fetch<{ logs: Log[]; count: number }>("/admin/patrix/integrations/logs", { query: { limit: PAGE, offset, ...(onlyErrors ? { ok: "false" } : {}) } }),
  })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="logs-errors"
          checked={onlyErrors}
          onCheckedChange={(v) => {
            setOnlyErrors(v === true)
            setOffset(0)
          }}
        />
        <Label htmlFor="logs-errors">Tylko błędy</Label>
      </div>
      {isLoading && <Text>Wczytywanie…</Text>}
      {data && data.logs.length === 0 && <Text className="text-ui-fg-subtle">Dziennik jest pusty.</Text>}
      {data && data.logs.length > 0 && (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Czas</Table.HeaderCell>
                <Table.HeaderCell>Integracja</Table.HeaderCell>
                <Table.HeaderCell>Operacja</Table.HeaderCell>
                <Table.HeaderCell>Wynik</Table.HeaderCell>
                <Table.HeaderCell>Opis</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.logs.map((l) => (
                <Table.Row key={l.id}>
                  <Table.Cell>{dateTime(l.created_at)}</Table.Cell>
                  <Table.Cell>{l.adapter}</Table.Cell>
                  <Table.Cell>
                    {l.operation} <span className="text-ui-fg-muted">({l.direction === "inbound" ? "przychodzące" : "wychodzące"})</span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={l.ok ? "green" : "red"}>
                      {l.ok ? "OK" : "błąd"}
                    </Badge>
                    {l.duration_ms !== null && <span className="text-ui-fg-muted"> {l.duration_ms} ms</span>}
                  </Table.Cell>
                  <Table.Cell>{[l.message, l.reference].filter(Boolean).join(" · ") || "–"}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <Pager offset={offset} count={data.count} shown={data.logs.length} onChange={setOffset} />
        </>
      )}
    </div>
  )
}

const IntegrationsPage = () => (
  <Container className="flex flex-col gap-4 p-6">
    <div>
      <Heading level="h1">Integracje</Heading>
      <Text className="text-ui-fg-subtle">
        Płatności, przewoźnicy i systemy zewnętrzne. Integracja działa dopiero po podłączeniu adaptera, wpisaniu danych z konta operatora i udanym teście
        połączenia. Dane dostępowe są szyfrowane i nie są ponownie wyświetlane.
      </Text>
    </div>
    <Tabs defaultValue="connections">
      <Tabs.List>
        <Tabs.Trigger value="connections">Połączenia</Tabs.Trigger>
        <Tabs.Trigger value="webhooks">Powiadomienia (webhooki)</Tabs.Trigger>
        <Tabs.Trigger value="logs">Dziennik</Tabs.Trigger>
      </Tabs.List>
      <div className="pt-4">
        <Tabs.Content value="connections">
          <ConnectionsTab />
        </Tabs.Content>
        <Tabs.Content value="webhooks">
          <WebhooksTab />
        </Tabs.Content>
        <Tabs.Content value="logs">
          <LogsTab />
        </Tabs.Content>
      </div>
    </Tabs>
  </Container>
)

export const config = defineRouteConfig({ label: "Integracje", icon: Puzzle })

export default IntegrationsPage
