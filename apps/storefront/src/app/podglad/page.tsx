import type { Metadata } from "next"
import { Suspense } from "react"
import { CmsSections } from "@/components/cms/sections"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { visibleSections } from "@/lib/cms/types"
import { getPreviewPage } from "@/lib/data/cms"

export const metadata: Metadata = { title: "Podgląd strony głównej", robots: { index: false, follow: false } }

async function Preview({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const page = token ? await getPreviewPage(token) : null
  if (!page) {
    return (
      <Container className="py-12">
        <h1 className="text-3xl font-extrabold">Podgląd niedostępny</h1>
        <p className="mt-3 text-muted">Link podglądu jest nieprawidłowy lub wygasł. Wygeneruj nowy w panelu: Treści → Strona główna.</p>
      </Container>
    )
  }
  return (
    <>
      <p role="status" className="sticky top-0 z-40 bg-highlight px-4 py-2 text-center text-sm font-semibold text-highlight-foreground">
        Podgląd szkicu (wersja {page.version}). Klienci widzą opublikowaną wersję.
      </p>
      <CmsSections sections={visibleSections(page.content)} />
    </>
  )
}

export default function PreviewPage(props: { searchParams: Promise<{ token?: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-64" />}>
      <Preview {...props} />
    </Suspense>
  )
}
