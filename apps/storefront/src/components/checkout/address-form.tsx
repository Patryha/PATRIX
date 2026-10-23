"use client"

import { useActionState, useState } from "react"
import { buttonClasses } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { saveAddress, type FormState } from "@/lib/actions/checkout"
import { cn } from "@/lib/cn"

export type AddressDefaults = Partial<Record<"email" | "first_name" | "last_name" | "phone" | "address_1" | "postal_code" | "city" | "company" | "nip", string>> & {
  invoice?: boolean
}

export function AddressForm({ defaults }: { defaults: AddressDefaults }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAddress, null)
  const v = (k: keyof AddressDefaults) => state?.values?.[k] ?? (defaults[k] as string | undefined) ?? ""
  const e = (k: string) => state?.errors?.[k] ?? null
  const [invoice, setInvoice] = useState(defaults.invoice ?? false)

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field label="E-mail" name="email" type="email" autoComplete="email" required defaultValue={v("email")} error={e("email")} hint="Wyślemy na niego potwierdzenie zamówienia." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię" name="first_name" autoComplete="given-name" required defaultValue={v("first_name")} error={e("first_name")} />
        <Field label="Nazwisko" name="last_name" autoComplete="family-name" required defaultValue={v("last_name")} error={e("last_name")} />
      </div>
      <Field label="Telefon" name="phone" type="tel" autoComplete="tel" required defaultValue={v("phone")} error={e("phone")} hint="Dla kuriera, np. 600 700 800." />
      <Field label="Ulica i numer" name="address_1" autoComplete="street-address" required defaultValue={v("address_1")} error={e("address_1")} />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Kod pocztowy" name="postal_code" autoComplete="postal-code" inputMode="numeric" placeholder="00-000" required defaultValue={v("postal_code")} error={e("postal_code")} />
        <Field label="Miejscowość" name="city" autoComplete="address-level2" required defaultValue={v("city")} error={e("city")} />
      </div>
      <p className="text-sm text-muted">Dostarczamy na terenie Polski.</p>

      <label className="flex min-h-11 items-center gap-2 font-medium">
        <input type="checkbox" checked={invoice} onChange={(ev) => setInvoice(ev.target.checked)} className="size-5 accent-accent-strong" />
        Chcę otrzymać fakturę na firmę
      </label>
      {invoice ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Flaga w polu ukrytym: React po akcji resetuje formularz, co odznaczałoby kontrolowany checkbox w DOM. */}
          <input type="hidden" name="invoice" value="on" />
          <Field label="Nazwa firmy" name="company" autoComplete="organization" required defaultValue={v("company")} error={e("company")} />
          <Field label="NIP" name="nip" inputMode="numeric" required defaultValue={v("nip")} error={e("nip")} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "accent" })}>
          {pending ? "Zapisywanie…" : "Zapisz i wybierz dostawę"}
        </button>
        <p role="status" aria-live="polite" className={cn("text-sm", state && !state.ok ? "text-danger" : "text-muted")}>
          {state?.message}
        </p>
      </div>
    </form>
  )
}
