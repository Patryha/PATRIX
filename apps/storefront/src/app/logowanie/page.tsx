import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "@/components/account/login-form"
import { Container } from "@/components/ui/container"
import { safeRedirect } from "@/lib/validation/account"

export const metadata: Metadata = { title: "Logowanie", robots: { index: false } }

async function LoginWithRedirect({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return <LoginForm next={next ? safeRedirect(next) : undefined} />
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Container className="py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className="text-3xl font-extrabold">Logowanie</h1>
        <Suspense fallback={<LoginForm />}>
          <LoginWithRedirect searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  )
}
