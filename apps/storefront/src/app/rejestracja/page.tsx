import type { Metadata } from "next"
import { RegisterForm } from "@/components/account/register-form"
import { Container } from "@/components/ui/container"

export const metadata: Metadata = { title: "Załóż konto", robots: { index: false } }

export default function RegisterPage() {
  return (
    <Container className="py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className="text-3xl font-extrabold">Załóż konto</h1>
        <p className="text-muted">Konto pozwala śledzić zamówienia i szybciej robić zakupy. Zakupy bez konta też są możliwe.</p>
        <RegisterForm />
      </div>
    </Container>
  )
}
