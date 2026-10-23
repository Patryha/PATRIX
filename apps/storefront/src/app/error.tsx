"use client"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"

/** Błąd renderowania: komunikat bez szczegółów technicznych (te trafiają do logów serwera). */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-3xl font-bold">Coś poszło nie tak</h1>
      <p className="text-muted">Nie udało się wczytać strony. Spróbuj ponownie za chwilę.</p>
      <Button onClick={reset}>Spróbuj ponownie</Button>
    </Container>
  )
}
