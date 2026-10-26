import type { Metadata } from "next"
import Image from "next/image"
import { Suspense } from "react"
import { CmsSections } from "@/components/cms/sections"
import { FooterContent } from "@/components/layout/footer"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { canOptimize } from "@/lib/cms/images"
import { menuImages, type LayoutContent } from "@/lib/cms/layout"
import { visibleSections } from "@/lib/cms/types"
import { listTopCategories } from "@/lib/data/categories"
import { getPreviewPage } from "@/lib/data/cms"

export const metadata: Metadata = { title: "Podgląd treści", robots: { index: false, follow: false } }

/** Podgląd menu (kategorie z grafikami) i stopki ze szkicu. */
async function LayoutPreview({ layout }: { layout: LayoutContent }) {
  const categories = await listTopCategories().catch(() => [])
  const images = menuImages(layout)
  return (
    <>
      <Container className="flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-extrabold">Podgląd menu i stopki</h1>
        <h2 className="text-xl font-bold">Menu kategorii</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              {images[c.handle] ? (
                <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-surface-muted">
                  <Image src={images[c.handle].url} alt={images[c.handle].alt} fill sizes="300px" className="object-cover" unoptimized={!canOptimize(images[c.handle].url)} />
                </div>
              ) : (
                <p className="text-xs text-muted">Bez grafiki</p>
              )}
              <span className="font-semibold">{c.name}</span>
            </li>
          ))}
        </ul>
      </Container>
      <FooterContent footer={layout.footer} preview />
    </>
  )
}

async function Preview({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const page = token ? await getPreviewPage(token) : null
  if (!page) {
    return (
      <Container className="py-12">
        <h1 className="text-3xl font-extrabold">Podgląd niedostępny</h1>
        <p className="mt-3 text-muted">Link podglądu jest nieprawidłowy lub wygasł. Wygeneruj nowy w panelu (Strona główna albo Menu i stopka).</p>
      </Container>
    )
  }
  return (
    <>
      <p role="status" className="sticky top-0 z-40 bg-highlight px-4 py-2 text-center text-sm font-semibold text-highlight-foreground">
        Podgląd szkicu (wersja {page.version}). Klienci widzą opublikowaną wersję.
      </p>
      {page.page_key === "layout" ? <LayoutPreview layout={page.content} /> : <CmsSections sections={visibleSections(page.content)} />}
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
