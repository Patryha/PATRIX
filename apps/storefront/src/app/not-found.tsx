import { ButtonLink } from "@/components/ui/button"
import { Container } from "@/components/ui/container"

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start gap-4 py-16">
      <p className="font-display text-6xl font-extrabold text-accent-strong">404</p>
      <h1 className="text-3xl font-bold">Nie znaleźliśmy tej strony</h1>
      <p className="text-muted">Strona mogła zostać przeniesiona albo adres zawiera literówkę.</p>
      <ButtonLink href="/">Wróć na stronę główną</ButtonLink>
    </Container>
  )
}
