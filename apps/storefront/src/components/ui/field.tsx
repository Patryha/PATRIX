import { useId, type InputHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/cn"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
  error?: string | null
  hideLabel?: boolean
}

/**
 * Pole formularza z etykietą, podpowiedzią i komunikatem błędu powiązanymi przez aria-describedby.
 * Błąd ogłaszany jest czytnikom ekranu (role="alert") i oznaczony nie tylko kolorem.
 */
export function Field({ label, hint, error, hideLabel, id, className, required, ...props }: FieldProps) {
  const generated = useId()
  const inputId = id ?? generated
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className={cn("text-sm font-medium text-foreground", hideLabel && "sr-only")}>
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "min-h-11 rounded-md border bg-surface px-3 text-base text-foreground placeholder:text-muted transition-colors duration-200",
          "focus:border-accent-strong focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1",
          error ? "border-danger" : "border-border hover:border-muted"
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1 text-sm font-medium text-danger">
          <span aria-hidden>⚠</span> {error}
        </p>
      ) : null}
    </div>
  )
}
