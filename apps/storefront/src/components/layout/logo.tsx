import Link from "next/link"

/** Logotyp PATRIX (znak słowny). Znak „X” w kolorze teal nawiązuje do akcentu marki. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="PATRIX, strona główna">
      <span className="flex items-center gap-2">
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden>
          <rect width="32" height="32" rx="8" fill="var(--px-primary)" />
          <path d="M9 23V9h7.2a4.6 4.6 0 0 1 0 9.2H13" stroke="var(--px-primary-foreground)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m18.5 19.5 5 5m0-5-5 5" stroke="var(--px-accent)" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
          PATRI<span className="text-accent-strong">X</span>
        </span>
      </span>
    </Link>
  )
}
