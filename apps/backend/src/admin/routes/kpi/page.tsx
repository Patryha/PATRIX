import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import { Badge, Container, Heading, Select, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/sdk"

type Kpi = {
  days: number
  can_see_money: boolean
  orders: { current: number; previous: number; change: number | null }
  revenue: { current: number; previous: number; change: number | null } | null
  average_order_value: { current: number | null; previous: number | null } | null
  daily: { date: string; orders: number; revenue: number | null }[]
  top_products: { product_id: string; title: string; quantity: number }[]
  awaiting_fulfillment: number
  new_customers: number
  low_stock: { count: number; items: { inventory_item_id: string; sku: string | null; title: string | null; available: number }[] }
  products: Record<string, number>
  product_data: Record<string, number>
}

const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" })
const shortDate = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" })
const money = (v: number | null | undefined) => (v == null ? "–" : pln.format(v))

function Change({ value }: { value: number | null }) {
  if (value === null) {
    return <Text size="xsmall" className="text-ui-fg-subtle">brak danych do porównania</Text>
  }
  return (
    <Badge size="2xsmall" color={value > 0 ? "green" : value < 0 ? "red" : "grey"}>
      {value > 0 ? "+" : ""}
      {value.toLocaleString("pl-PL")}% względem poprzedniego okresu
    </Badge>
  )
}

function Card({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-y-1 rounded-lg border border-ui-border-base p-4">
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text size="xlarge" weight="plus">
        {value}
      </Text>
      {children}
    </div>
  )
}

/** Wykres słupkowy zamówień dziennych; te same dane są w tabeli dla czytników ekranu. */
function DailyChart({ daily }: { daily: Kpi["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.orders))
  return (
    <figure className="flex flex-col gap-y-2">
      <div className="flex h-32 items-end gap-px" aria-hidden="true">
        {daily.map((d) => (
          <div
            key={d.date}
            title={`${shortDate.format(new Date(d.date))}: ${d.orders}`}
            className="flex-1 rounded-t-sm bg-ui-fg-interactive"
            style={{ height: `${(d.orders / max) * 100}%`, minHeight: d.orders ? 2 : 0 }}
          />
        ))}
      </div>
      <figcaption className="flex justify-between">
        <Text size="xsmall" className="text-ui-fg-subtle">
          {shortDate.format(new Date(daily[0].date))}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {shortDate.format(new Date(daily[daily.length - 1].date))}
        </Text>
      </figcaption>
      <details>
        <summary className="cursor-pointer text-ui-fg-subtle txt-small">Pokaż dane dzienne w tabeli</summary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Dzień</Table.HeaderCell>
              <Table.HeaderCell>Zamówienia</Table.HeaderCell>
              {daily[0].revenue !== null ? <Table.HeaderCell>Sprzedaż</Table.HeaderCell> : null}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {daily.map((d) => (
              <Table.Row key={d.date}>
                <Table.Cell>{d.date}</Table.Cell>
                <Table.Cell>{d.orders}</Table.Cell>
                {d.revenue !== null ? <Table.Cell>{money(d.revenue)}</Table.Cell> : null}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </details>
    </figure>
  )
}

const KpiPage = () => {
  const [days, setDays] = useState("30")
  const { data, isLoading, error } = useQuery({
    queryKey: ["patrix-kpi", days],
    queryFn: () => sdk.client.fetch<Kpi>("/admin/patrix/kpi", { query: { days } }),
  })

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h1">Pulpit sprzedaży</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Zamówienia bez anulowanych i szkiców. Dni według czasu polskiego.
          </Text>
        </div>
        <div className="w-40">
          <Select value={days} onValueChange={setDays}>
            <Select.Trigger aria-label="Okres">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="7">Ostatnie 7 dni</Select.Item>
              <Select.Item value="30">Ostatnie 30 dni</Select.Item>
              <Select.Item value="90">Ostatnie 90 dni</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </Container>

      {isLoading ? (
        <Container>
          <Text>Wczytywanie…</Text>
        </Container>
      ) : error || !data ? (
        <Container>
          <Text className="text-ui-fg-error">Nie udało się wczytać wskaźników: {(error as Error | null)?.message}</Text>
        </Container>
      ) : (
        <>
          <Container className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-2 xl:grid-cols-4">
            <Card label="Zamówienia" value={data.orders.current.toLocaleString("pl-PL")}>
              <Change value={data.orders.change} />
            </Card>
            {data.revenue ? (
              <Card label="Sprzedaż brutto" value={money(data.revenue.current)}>
                <Change value={data.revenue.change} />
              </Card>
            ) : null}
            {data.average_order_value ? <Card label="Średnia wartość zamówienia" value={money(data.average_order_value.current)} /> : null}
            <Card label="Nowe konta klientów" value={data.new_customers.toLocaleString("pl-PL")} />
            <Card label="Do wysłania (wszystkie otwarte)" value={data.awaiting_fulfillment.toLocaleString("pl-PL")}>
              <Link to="/orders" className="txt-small text-ui-fg-interactive">
                Przejdź do zamówień
              </Link>
            </Card>
            {!data.can_see_money ? (
              <Text size="small" className="text-ui-fg-subtle md:col-span-2">
                Kwoty sprzedaży widzą osoby z uprawnieniem do finansów.
              </Text>
            ) : null}
          </Container>

          <Container className="flex flex-col gap-y-3 px-6 py-4">
            <Heading level="h2">Zamówienia dziennie</Heading>
            <DailyChart daily={data.daily} />
          </Container>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <Container className="flex flex-col gap-y-3 px-6 py-4">
              <Heading level="h2">Najczęściej kupowane</Heading>
              {data.top_products.length ? (
                <ol className="flex flex-col gap-y-2">
                  {data.top_products.map((p) => (
                    <li key={p.product_id} className="flex justify-between gap-3">
                      <Link to={`/products/${p.product_id}`} className="txt-small text-ui-fg-interactive">
                        {p.title}
                      </Link>
                      <Text size="small">{p.quantity} szt.</Text>
                    </li>
                  ))}
                </ol>
              ) : (
                <Text size="small" className="text-ui-fg-subtle">
                  Brak sprzedaży w tym okresie.
                </Text>
              )}
            </Container>

            <Container className="flex flex-col gap-y-3 px-6 py-4">
              <Heading level="h2">Niski stan magazynu ({data.low_stock.count})</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Dostępne (stan minus rezerwacje) 5 szt. lub mniej.
              </Text>
              {data.low_stock.items.length ? (
                <ul className="flex flex-col gap-y-2">
                  {data.low_stock.items.map((i) => (
                    <li key={i.inventory_item_id} className="flex justify-between gap-3">
                      <Link to={`/inventory/${i.inventory_item_id}`} className="txt-small text-ui-fg-interactive">
                        {i.title ?? i.sku ?? i.inventory_item_id}
                        {i.sku ? ` (${i.sku})` : ""}
                      </Link>
                      <Text size="small">{i.available} szt.</Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text size="small" className="text-ui-fg-subtle">
                  Wszystkie pozycje mają zapas.
                </Text>
              )}
            </Container>
          </div>

          <Container className="flex flex-col gap-y-3 px-6 py-4">
            <Heading level="h2">Katalog i dane produktów</Heading>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Card label="Opublikowane" value={String(data.products.published ?? 0)} />
              <Card label="Szkice" value={String(data.products.draft ?? 0)} />
              <Card label="Dane zweryfikowane" value={String(data.product_data.verified ?? 0)} />
              <Card label="Dane do uzupełnienia" value={String(data.product_data.needs_review ?? 0)} />
              <Card label="Dane w szkicu" value={String(data.product_data.draft ?? 0)} />
            </div>
          </Container>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({ label: "Pulpit sprzedaży", icon: ChartBar })

export default KpiPage
