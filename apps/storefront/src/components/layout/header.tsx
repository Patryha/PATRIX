import { Suspense } from "react"
import { Container } from "@/components/ui/container"
import { listTopCategories } from "@/lib/data/categories"
import { CategoryMenu } from "./category-menu"
import { HeaderActions, HeaderActionsFallback } from "./header-actions"
import { Logo } from "./logo"
import { SearchForm } from "./search-form"
import { ThemeToggle } from "./theme-toggle"

async function CategoryMenuLoader() {
  const categories = await listTopCategories().catch(() => [])
  return <CategoryMenu categories={categories} />
}

function CategoryMenuFallback() {
  return (
    <button type="button" disabled className="flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold text-muted">
      Kategorie
    </button>
  )
}

/** Przyklejony nagłówek: logo, wyszukiwarka, kategorie, motyw, konto i koszyk. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container className="flex flex-col gap-2 py-2 md:gap-3 md:py-3">
        <div className="flex items-center gap-3 md:gap-6">
          <Logo className="shrink-0" />
          <SearchForm className="hidden md:block md:max-w-xl md:flex-1" id="search-desktop" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<HeaderActionsFallback />}>
              <HeaderActions />
            </Suspense>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<CategoryMenuFallback />}>
            <CategoryMenuLoader />
          </Suspense>
          <SearchForm className="md:hidden" id="search-mobile" />
        </div>
      </Container>
    </header>
  )
}
