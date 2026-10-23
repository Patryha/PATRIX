"use client"

import { useActionState } from "react"
import { buttonClasses } from "@/components/ui/button"
import { applyPromoCode, removePromoCode, type ActionState } from "@/lib/actions/cart"
import { cn } from "@/lib/cn"

export function PromoForm({ codes }: { codes: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(applyPromoCode, null)
  return (
    <div className="flex flex-col gap-2">
      <form action={action} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="promo-code" className="text-sm font-semibold">
            Kod rabatowy
          </label>
          <input
            id="promo-code"
            name="code"
            autoComplete="off"
            maxLength={50}
            className="min-h-11 rounded-md border border-border bg-surface px-3 text-base uppercase"
          />
        </div>
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "secondary" })}>
          Zastosuj
        </button>
      </form>
      <p role="status" aria-live="polite" className={cn("text-sm", state && !state.ok ? "text-danger" : "text-muted")}>
        {state?.message}
      </p>
      {codes.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Naliczone kody">
          {codes.map((code) => (
            <li key={code}>
              <form action={removePromoCode} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-sm">
                <input type="hidden" name="code" value={code} />
                <span className="font-semibold uppercase">{code}</span>
                <button type="submit" className="min-h-6 px-1 text-muted hover:text-danger" aria-label={`Usuń kod ${code}`}>
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
