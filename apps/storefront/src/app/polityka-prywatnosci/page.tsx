import type { Metadata } from "next"
import { Container } from "@/components/ui/container"

export const metadata: Metadata = { title: "Polityka prywatności", robots: { index: false } }

/**
 * Treść dokumentu przygotowuje i zatwierdza właściciel sklepu (z prawnikiem). Nie publikujemy wzorów ani
 * tekstów wymyślonych przez zespół: strona informuje, że dokument powstaje (zadanie OWN-6 w TASKS.md).
 */
export default function Page() {
  return (
    <Container className="py-8">
      <div className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Polityka prywatności</h1>
        <p>Dokument jest w przygotowaniu i zostanie opublikowany przed uruchomieniem sprzedaży.</p>
      </div>
    </Container>
  )
}
