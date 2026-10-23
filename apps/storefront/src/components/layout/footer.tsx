import Link from "next/link"
import { Container } from "@/components/ui/container"
import { Logo } from "./logo"

/** Stopka. Linki do stron informacyjnych i prawnych pojawią się wraz z modułem treści (Etap 4/8). */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container className="grid gap-8 py-10 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">Niemiecka jakość na co dzień. Oryginalne produkty importowane z Niemiec.</p>
        </div>
        <nav aria-label="Zakupy" className="flex flex-col gap-2 text-sm">
          <h2 className="font-display text-base font-bold">Zakupy</h2>
          <Link href="/szukaj" className="text-muted hover:text-accent-strong">
            Wyszukiwarka produktów
          </Link>
          <Link href="/kategoria/nowosci-z-niemiec" className="text-muted hover:text-accent-strong">
            Nowości z Niemiec
          </Link>
          <Link href="/kategoria/promocje" className="text-muted hover:text-accent-strong">
            Promocje
          </Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <h2 className="font-display text-base font-bold">PATRIX</h2>
          <p className="text-muted">Sklep w przygotowaniu. Dane firmy, regulamin i polityka prywatności zostaną opublikowane przed uruchomieniem sprzedaży.</p>
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="py-4 text-xs text-muted">© PATRIX</Container>
      </div>
    </footer>
  )
}
