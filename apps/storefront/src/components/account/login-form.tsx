"use client"

import Link from "next/link"
import { useActionState } from "react"
import { buttonClasses } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { login } from "@/lib/actions/account"
import type { FormState } from "@/lib/actions/checkout"

/** Adres powrotu (`?next=`) dopisujemy przy wysyłce: strona renderuje się raz, bez podmiany formularza w trakcie wpisywania. */
async function loginWithNext(prev: FormState, formData: FormData) {
  formData.set("next", new URLSearchParams(window.location.search).get("next") ?? "")
  return login(prev, formData)
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginWithNext, null)
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field label="E-mail" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email ?? ""} error={state?.errors?.email} />
      <Field label="Hasło" name="password" type="password" autoComplete="current-password" required error={state?.errors?.password} />
      <p role="alert" className="min-h-5 text-sm text-danger">
        {state && !state.ok ? state.message : null}
      </p>
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "accent", size: "lg" })}>
        {pending ? "Logowanie…" : "Zaloguj się"}
      </button>
      <p className="text-sm">
        Nie masz konta?{" "}
        <Link href="/rejestracja" className="font-semibold text-accent-strong underline">
          Załóż konto
        </Link>
      </p>
    </form>
  )
}
