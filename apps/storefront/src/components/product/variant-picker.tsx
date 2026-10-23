"use client"

import { useMemo, useState } from "react"
import { AddToCart } from "@/components/cart/add-to-cart"
import { Badge } from "@/components/ui/badge"
import { Price } from "@/components/ui/price"
import type { ProductDetail } from "@/lib/data/products"
import type { UnitMeasure } from "@/lib/format"
import { cn } from "@/lib/cn"

type Props = Pick<ProductDetail, "options" | "variants" | "lowest30d"> & { measure: UnitMeasure | null }

/** Wybór wariantu: cena (z informacją Omnibus i ceną jednostkową), dostępność, SKU i EAN wybranego wariantu. */
export function VariantPicker({ options, variants, lowest30d, measure }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>(() => variants[0]?.options ?? {})
  const variant = useMemo(
    () => variants.find((v) => Object.entries(selected).every(([k, val]) => v.options[k] === val)) ?? null,
    [variants, selected]
  )
  const choosable = options.filter((o) => o.values.length > 1)

  return (
    <div className="flex flex-col gap-4">
      {variant?.price ? (
        <Price
          amount={variant.price.amount}
          currency={variant.price.currency}
          original={variant.price.original}
          lowest30d={lowest30d[variant.id] ?? null}
          measure={variants.length === 1 ? measure : null}
          size="lg"
        />
      ) : (
        <p className="text-muted">{variant ? "Cena wkrótce" : "Ta kombinacja nie jest dostępna"}</p>
      )}

      {choosable.map((option) => (
        <fieldset key={option.id} className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">
            {option.title}: <span className="font-normal">{selected[option.title] ?? "wybierz"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const id = `opt-${option.id}-${value}`
              const checked = selected[option.title] === value
              return (
                <label
                  key={value}
                  htmlFor={id}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center rounded-md border px-4 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-strong",
                    checked ? "border-accent-strong bg-accent-strong text-accent-foreground" : "border-border bg-surface hover:border-accent"
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`opt-${option.id}`}
                    value={value}
                    checked={checked}
                    onChange={() => setSelected((s) => ({ ...s, [option.title]: value }))}
                    className="sr-only"
                  />
                  {value}
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}

      <AddToCart
        variantId={variant?.id ?? null}
        available={variant?.inStock ?? false}
        price={variant?.price ? { amount: variant.price.amount, currency: variant.price.currency } : null}
      />

      {variant ? (
        <div className="flex flex-col gap-1 text-sm" aria-live="polite">
          {variant.inStock ? (
            <span className="font-medium text-accent-strong">Dostępny</span>
          ) : (
            <Badge className="w-fit">Chwilowo niedostępny</Badge>
          )}
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
            {variant.sku ? (
              <div className="flex gap-1">
                <dt>SKU:</dt>
                <dd className="tabular-nums">{variant.sku}</dd>
              </div>
            ) : null}
            {variant.ean ? (
              <div className="flex gap-1">
                <dt>EAN:</dt>
                <dd className="tabular-nums">{variant.ean}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
