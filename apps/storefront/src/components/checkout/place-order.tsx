"use client"

import Link from "next/link"
import { useActionState } from "react"
import { buttonClasses } from "@/components/ui/button"
import { placeOrder, type FormState } from "@/lib/actions/checkout"

export function PlaceOrder({ total }: { total: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(placeOrder, null)
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required aria-invalid={state?.errors?.terms ? true : undefined} className="mt-0.5 size-5 shrink-0 accent-accent-strong" />
        <span>
          Akceptuję{" "}
          <Link href="/regulamin" className="font-semibold text-accent-strong underline">
            regulamin sklepu
          </Link>{" "}
          i zapoznałem/-am się z{" "}
          <Link href="/polityka-prywatnosci" className="font-semibold text-accent-strong underline">
            polityką prywatności
          </Link>
          .
        </span>
      </label>
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "accent", size: "lg" })}>
        {pending ? "Składanie zamówienia…" : `Zamawiam z obowiązkiem zapłaty (${total})`}
      </button>
      <p role="alert" className="text-sm text-danger">
        {state && !state.ok ? state.message : null}
      </p>
    </form>
  )
}
