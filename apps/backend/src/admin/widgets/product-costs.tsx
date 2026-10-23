import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Label, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/sdk"

type Row = { id: string; title: string; sku: string | null; price_gross: number | null; purchase_price_net: number | null; supplier: string | null }

const pln = (v: number | null) => (v === null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v))

/** Ceny zakupu: widoczne wyłącznie dla ról z uprawnieniem finance (dla pozostałych widżet się nie renderuje). */
const ProductCostsWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const key = ["patrix-costs", product.id]
  const { data, isError } = useQuery({
    queryKey: key,
    queryFn: () => sdk.client.fetch<{ variants: Row[] }>(`/admin/patrix/products/${product.id}/costs`),
    retry: false,
  })
  const [draft, setDraft] = useState<Record<string, { price: string; supplier: string }>>({})
  const save = useMutation({
    mutationFn: ({ id, price, supplier }: { id: string; price: number; supplier: string }) =>
      sdk.client.fetch(`/admin/patrix/variants/${id}/cost`, { method: "POST", body: { purchase_price: price, supplier: supplier || null } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      toast.success("Zapisano cenę zakupu")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isError || !data) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Ceny zakupu (poufne)</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Widoczne tylko dla ról z dostępem do finansów. Cena zakupu netto, cena sprzedaży brutto.
        </Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Wariant</Table.HeaderCell>
            <Table.HeaderCell>Cena sprzedaży</Table.HeaderCell>
            <Table.HeaderCell>Cena zakupu netto</Table.HeaderCell>
            <Table.HeaderCell>Dostawca</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.variants.map((v) => {
            const d = draft[v.id] ?? { price: v.purchase_price_net?.toString() ?? "", supplier: v.supplier ?? "" }
            const set = (patch: Partial<typeof d>) => setDraft((s) => ({ ...s, [v.id]: { ...d, ...patch } }))
            return (
              <Table.Row key={v.id}>
                <Table.Cell>
                  {v.title}
                  {v.sku ? ` (${v.sku})` : ""}
                </Table.Cell>
                <Table.Cell>{pln(v.price_gross)}</Table.Cell>
                <Table.Cell>
                  <Label htmlFor={`cost-${v.id}`} className="sr-only">
                    Cena zakupu netto dla {v.title}
                  </Label>
                  <Input id={`cost-${v.id}`} size="small" inputMode="decimal" value={d.price} onChange={(e) => set({ price: e.target.value })} />
                </Table.Cell>
                <Table.Cell>
                  <Label htmlFor={`supplier-${v.id}`} className="sr-only">
                    Dostawca dla {v.title}
                  </Label>
                  <Input id={`supplier-${v.id}`} size="small" value={d.supplier} onChange={(e) => set({ supplier: e.target.value })} />
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={d.price.trim() === "" || Number.isNaN(Number(d.price.replace(",", ".")))}
                    onClick={() => save.mutate({ id: v.id, price: Number(d.price.replace(",", ".")), supplier: d.supplier.trim() })}
                  >
                    Zapisz
                  </Button>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product.details.side.after" })

export default ProductCostsWidget
