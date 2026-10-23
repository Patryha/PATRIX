"use client"

import Link from "next/link"
import { useActionState } from "react"
import { buttonClasses } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { login } from "@/lib/actions/account"
import type { FormState } from "@/lib/actions/checkout"

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null)
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
