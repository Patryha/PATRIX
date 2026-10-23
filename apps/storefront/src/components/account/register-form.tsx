"use client"

import Link from "next/link"
import { useActionState } from "react"
import { buttonClasses } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { register } from "@/lib/actions/account"
import type { FormState } from "@/lib/actions/checkout"

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(register, null)
  const v = (k: string) => state?.values?.[k] ?? ""
  const e = (k: string) => state?.errors?.[k]
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field label="E-mail" name="email" type="email" autoComplete="email" required defaultValue={v("email")} error={e("email")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię" name="first_name" autoComplete="given-name" required defaultValue={v("first_name")} error={e("first_name")} />
        <Field label="Nazwisko" name="last_name" autoComplete="family-name" required defaultValue={v("last_name")} error={e("last_name")} />
      </div>
      <Field
        label="Hasło"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={e("password")}
        hint="Co najmniej 10 znaków, w tym litera i cyfra."
      />
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="terms"
          required
          defaultChecked={v("terms") === "on"}
          aria-invalid={e("terms") ? true : undefined}
          aria-describedby={e("terms") ? "terms-error" : undefined}
          className="mt-0.5 size-5 shrink-0 accent-accent-strong"
        />
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
      {e("terms") ? (
        <p id="terms-error" className="text-sm text-danger">
          {e("terms")}
        </p>
      ) : null}
      <p role="alert" className="min-h-5 text-sm text-danger">
        {state && !state.ok ? state.message : null}
      </p>
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "accent", size: "lg" })}>
        {pending ? "Zakładanie konta…" : "Załóż konto"}
      </button>
      <p className="text-sm">
        Masz już konto?{" "}
        <Link href="/logowanie" className="font-semibold text-accent-strong underline">
          Zaloguj się
        </Link>
      </p>
    </form>
  )
}
