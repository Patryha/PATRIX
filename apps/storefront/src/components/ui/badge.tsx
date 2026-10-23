import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

const tones = {
  neutral: "bg-surface-muted text-foreground",
  accent: "bg-accent-strong text-accent-foreground",
  highlight: "bg-highlight text-highlight-foreground",
  danger: "bg-danger text-white",
} as const

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  )
}
