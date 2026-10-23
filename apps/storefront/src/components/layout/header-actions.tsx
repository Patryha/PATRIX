import Link from "next/link"
import { CartIcon, UserIcon } from "@/components/ui/icons"
import { cartItemCount, retrieveCart } from "@/lib/data/cart"
import { getAuthToken } from "@/lib/session"

const linkClass =
  "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 font-medium hover:bg-surface-muted"

/** Konto i koszyk w nagłówku (dane klienta: renderowane dynamicznie w Suspense). */
export async function HeaderActions() {
  const [cart, token] = await Promise.all([retrieveCart(), getAuthToken()])
  const count = cartItemCount(cart)
  return (
    <>
      <Link href={token ? "/konto" : "/logowanie"} className={linkClass}>
        <UserIcon />
        <span className="sr-only md:not-sr-only md:text-sm">{token ? "Moje konto" : "Zaloguj się"}</span>
      </Link>
      <Link href="/koszyk" className={linkClass} aria-label={count ? `Koszyk, produktów: ${count}` : "Koszyk, pusty"}>
        <CartIcon />
        {count ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-xs font-bold text-highlight-foreground tabular-nums"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </>
  )
}

export function HeaderActionsFallback() {
  return (
    <>
      <Link href="/logowanie" className={linkClass}>
        <UserIcon />
        <span className="sr-only">Konto</span>
      </Link>
      <Link href="/koszyk" className={linkClass} aria-label="Koszyk">
        <CartIcon />
      </Link>
    </>
  )
}
