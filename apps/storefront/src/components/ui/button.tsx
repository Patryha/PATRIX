import Link from "next/link"
import type { ButtonHTMLAttributes, ComponentProps } from "react"
import { cn } from "@/lib/cn"

type Variant = "primary" | "secondary" | "accent" | "ghost" | "highlight" | "inverse"
type Size = "sm" | "md" | "lg"

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,box-shadow,transform,color] duration-200 ease-patrix active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none"

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:shadow-md hover:brightness-110",
  secondary: "border border-border bg-surface text-foreground hover:border-accent-strong hover:text-accent-strong",
  accent: "bg-accent-strong text-accent-foreground hover:brightness-110 hover:shadow-md",
  highlight: "bg-highlight text-highlight-foreground hover:brightness-105 hover:shadow-md",
  ghost: "text-foreground hover:bg-surface-muted",
  // Na tle sekcji marki (hero, banery).
  inverse: "border border-white/40 text-hero-foreground hover:bg-white/10",
}

// Minimalny obszar dotyku 44×44 px dla md/lg (WCAG 2.5.8: co najmniej 24×24).
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-12 px-6 text-lg",
}

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className)
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }

export function Button({ variant, size, loading, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />
}
