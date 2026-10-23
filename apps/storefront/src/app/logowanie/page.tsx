import type { Metadata } from "next"
import { LoginForm } from "@/components/account/login-form"
import { Container } from "@/components/ui/container"

export const metadata: Metadata = { title: "Logowanie", robots: { index: false } }

export default function LoginPage() {
  return (
    <Container className="py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className="text-3xl font-extrabold">Logowanie</h1>
        <LoginForm />
      </div>
    </Container>
  )
}
