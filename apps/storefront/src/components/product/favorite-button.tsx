"use client"

import { useActionState } from "react"
import { HeartIcon } from "@/components/ui/icons"
import { toggleFavorite, type FavoriteState } from "@/lib/actions/favorites"
import { cn } from "@/lib/cn"

/** Przełącznik „Ulubione” (formularz: działa także bez JavaScriptu). */
export function FavoriteButton({ handle, initial }: { handle: string; initial: boolean }) {
  const [state, action, pending] = useActionState<FavoriteState, FormData>(toggleFavorite, { favorite: initial, message: "" })
  const favorite = state?.favorite ?? initial
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="handle" value={handle} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-md border px-4 font-semibold transition-colors",
          favorite ? "border-accent bg-accent/10 text-accent-strong" : "border-border bg-surface hover:border-accent"
        )}
      >
        <HeartIcon className={cn(favorite && "fill-current")} />
        {favorite ? "W ulubionych" : "Dodaj do ulubionych"}
      </button>
      <span role="status" aria-live="polite" className="text-sm text-muted">
        {state?.message}
      </span>
    </form>
  )
}
