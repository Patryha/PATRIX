import Link from "next/link"
import { CartIcon, HeartIcon, UserIcon } from "@/components/ui/icons"
import { cartItemCount, retrieveCart } from "@/lib/data/cart"
import { getFavorites } from "@/lib/favorites"
import { getAuthToken } from "@/lib/session"

const linkClass =
  "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 font-medium hover:bg-surface-muted"

function Badge({ count }: { count: number }) {
  return (
    <span
      aria-hidden
      className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-xs font-bold text-highlight-foreground tabular-nums"
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

/** Konto, ulubione i koszyk w nagłówku (dane klienta: renderowane dynamicznie w Suspense). */
export async function HeaderActions() {
  const [cart, token, favorites] = await Promise.all([retrieveCart(), getAuthToken(), getFavorites().catch((): string[] => [])])
  const count = cartItemCount(cart)
  return (
    <>
      <Link
        href="/ulubione"
        className={linkClass}
        aria-label={favorites.length ? `Ulubione, produktów: ${favorites.length}` : "Ulubione"}
      >
        <HeartIcon />
        {favorites.length ? <Badge count={favorites.length} /> : null}
      </Link>
      <Link href={token ? "/konto" : "/logowanie"} className={linkClass}>
        <UserIcon />
        <span className="sr-only md:not-sr-only md:text-sm">{token ? "Moje konto" : "Zaloguj się"}</span>
      </Link>
      <Link href="/koszyk" className={linkClass} aria-label={count ? `Koszyk, produktów: ${count}` : "Koszyk, pusty"}>
        <CartIcon />
        {count ? <Badge count={count} /> : null}
      </Link>
    </>
  )
}

export function HeaderActionsFallback() {
  return (
    <>
      <Link href="/ulubione" className={linkClass} aria-label="Ulubione">
        <HeartIcon />
      </Link>
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
