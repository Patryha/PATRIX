import { formatPrice, unitPrice, type UnitMeasure } from "@/lib/format"
import { cn } from "@/lib/cn"

type PriceProps = {
  amount: number
  currency?: string
  /** Cena sprzed obniżki (prezentowana tylko z najniższą ceną z 30 dni — dyrektywa Omnibus). */
  original?: number | null
  /** Najniższa cena z 30 dni przed obniżką; bez niej nie pokazujemy przekreślonej ceny. */
  lowest30d?: number | null
  measure?: UnitMeasure | null
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Price({ amount, currency = "pln", original, lowest30d, measure, size = "md", className }: PriceProps) {
  const discounted = typeof original === "number" && original > amount && typeof lowest30d === "number"
  const unit = unitPrice(amount, measure, currency)
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={cn(
            "font-display font-bold tabular-nums",
            discounted ? "text-highlight-strong" : "text-foreground",
            size === "sm" && "text-base",
            size === "md" && "text-xl",
            size === "lg" && "text-3xl"
          )}
        >
          {formatPrice(amount, currency)}
        </span>
        {discounted ? (
          <span className="text-sm text-muted line-through tabular-nums">
            <span className="sr-only">Cena przed obniżką: </span>
            {formatPrice(original!, currency)}
          </span>
        ) : null}
      </div>
      {discounted ? (
        <span className="text-xs text-muted">Najniższa cena z 30 dni przed obniżką: {formatPrice(lowest30d!, currency)}</span>
      ) : null}
      {unit ? <span className="text-xs text-muted tabular-nums">{unit.label}</span> : null}
    </div>
  )
}
