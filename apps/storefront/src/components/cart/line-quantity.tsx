"use client"

import { useActionState } from "react"
import { updateLineQuantity, type ActionState } from "@/lib/actions/cart"
import { cn } from "@/lib/cn"

export function LineQuantity({ lineId, quantity, title }: { lineId: string; quantity: number; title: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateLineQuantity, null)
  const inputId = `qty-${lineId}`
  return (
    <div className="flex flex-col gap-1">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="lineId" value={lineId} />
        <label htmlFor={inputId} className="sr-only">
          Liczba sztuk: {title}
        </label>
        <input
          id={inputId}
          name="quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          defaultValue={quantity}
          key={quantity}
          className="min-h-11 w-20 rounded-md border border-border bg-surface px-2 text-base tabular-nums"
        />
        <button type="submit" disabled={pending} className="min-h-11 rounded-md px-3 text-sm font-semibold text-accent-strong underline disabled:opacity-50">
          Zmień
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="lineId" value={lineId} />
        <input type="hidden" name="quantity" value="0" />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md pr-3 text-sm font-semibold text-muted underline hover:text-danger disabled:opacity-50"
          aria-label={`Usuń z koszyka: ${title}`}
        >
          Usuń
        </button>
      </form>
      <p role="status" aria-live="polite" className={cn("text-xs", state && !state.ok ? "text-danger" : "text-muted")}>
        {state?.message}
      </p>
    </div>
  )
}
