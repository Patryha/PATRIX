"use client"

import { useActionState } from "react"
import { buttonClasses } from "@/components/ui/button"
import type { FormState } from "@/lib/actions/checkout"
import { cn } from "@/lib/cn"

type Choice = { id: string; label: string; detail?: string; disabled?: boolean }

type Props = {
  legend: string
  name: string
  choices: Choice[]
  selected: string | null
  submitLabel: string
  emptyText: string
  action: (prev: FormState, formData: FormData) => Promise<FormState>
}

/** Wybór jednej opcji (dostawa, płatność) jako grupa przycisków radiowych. */
export function ChoiceForm({ legend, name, choices, selected, submitLabel, emptyText, action }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null)
  if (!choices.length) {
    return <p className="rounded-md border border-dashed border-border p-4 text-muted">{emptyText}</p>
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{legend}</legend>
        {choices.map((c) => (
          <label
            key={c.id}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-4 py-2 has-[:checked]:border-accent-strong has-[:checked]:ring-1 has-[:checked]:ring-accent-strong",
              c.disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input type="radio" name={name} value={c.id} defaultChecked={c.id === selected} disabled={c.disabled} required className="size-5 accent-accent-strong" />
            <span className="flex flex-1 flex-wrap justify-between gap-2">
              <span className="font-medium">{c.label}</span>
              {c.detail ? <span className="tabular-nums text-muted">{c.detail}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "accent" })}>
          {pending ? "Zapisywanie…" : submitLabel}
        </button>
        <p role="status" aria-live="polite" className={cn("text-sm", state && !state.ok ? "text-danger" : "text-muted")}>
          {state?.message}
        </p>
      </div>
    </form>
  )
}
