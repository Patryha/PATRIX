"use client"

import Link from "next/link"
import { useActionState } from "react"
import { buttonClasses } from "@/components/ui/button"
import { addToCart, type ActionState } from "@/lib/actions/cart"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/cn"

type Props = { variantId: string | null; available: boolean; price: { amount: number; currency: string } | null }

const FORM_ID = "add-to-cart"

/** Dodawanie do koszyka; na telefonie przycisk jest też w przyklejonym pasku u dołu ekranu. */
export function AddToCart({ variantId, available, price }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addToCart, null)
  const disabled = !variantId || !available || !price || pending
  const label = !variantId ? "Wybierz wariant" : !available ? "Chwilowo niedostępny" : pending ? "Dodawanie…" : "Dodaj do koszyka"

  return (
    <>
      <form id={FORM_ID} action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="variantId" value={variantId ?? ""} />
        <div className="flex flex-col gap-1">
          <label htmlFor="qty" className="text-sm font-semibold">
            Liczba sztuk
          </label>
          <input
            id="qty"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            defaultValue={1}
            required
            className="min-h-11 w-24 rounded-md border border-border bg-surface px-3 text-base tabular-nums"
          />
        </div>
        <button type="submit" disabled={disabled} className={buttonClasses({ variant: "accent", size: "lg", className: "flex-1 sm:flex-none" })}>
          {label}
        </button>
      </form>
      <p role="status" aria-live="polite" className={cn("min-h-6 text-sm", state && !state.ok && "text-danger")}>
        {state?.message}{" "}
        {state?.ok ? (
          <Link href="/koszyk" className="font-semibold text-accent-strong underline">
            Przejdź do koszyka
          </Link>
        ) : null}
      </p>

      {/* Przyklejony pasek zakupu na telefonie (nie zasłania treści: strona ma dolny margines). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {price ? <span className="font-display text-lg font-bold tabular-nums">{formatPrice(price.amount, price.currency)}</span> : null}
          <button type="submit" form={FORM_ID} disabled={disabled} className={buttonClasses({ variant: "accent", className: "flex-1" })}>
            {label}
          </button>
        </div>
      </div>
      <div aria-hidden className="h-16 md:hidden" />
    </>
  )
}
