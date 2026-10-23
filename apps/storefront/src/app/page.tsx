import Link from "next/link"
import { connection } from "next/server"
import { Suspense } from "react"
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-card"
import { ButtonLink } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { FlagDeIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { listTopCategories } from "@/lib/data/categories"
import { listProducts } from "@/lib/data/products"

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero text-hero-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent opacity-25 blur-3xl"
      />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-highlight opacity-15 blur-3xl" />
      <Container className="relative grid gap-6 py-12 md:py-20">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
          <FlagDeIcon width={18} height={18} /> Oryginalne produkty z Niemiec
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-hero-foreground md:text-6xl">
          Niemiecka jakość <span className="text-hero-accent">na co dzień</span>
        </h1>
        <p className="max-w-xl text-lg opacity-90">
          Chemia gospodarcza, kosmetyki, słodycze i napoje prosto z Niemiec. Wybieraj spośród sprawdzonych marek w jednym miejscu.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/kategoria/nowosci-z-niemiec" variant="highlight" size="lg">
            Zobacz nowości
          </ButtonLink>
          <ButtonLink href="/kategoria/promocje" variant="inverse" size="lg">
            Promocje
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}

async function Categories() {
  await connection()
  const categories = await listTopCategories().catch(() => null)
  if (!categories) {
    return <p className="text-muted">Nie udało się wczytać kategorii. Odśwież stronę za chwilę.</p>
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((category, index) => (
        <li key={category.id}>
          <Link
            href={`/kategoria/${category.handle}`}
            className="group flex h-full min-h-24 flex-col justify-between gap-3 rounded-lg border border-border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-200 ease-patrix hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
          >
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full font-display text-lg font-bold"
              style={{
                background: index % 2 ? "var(--px-surface-muted)" : "color-mix(in srgb, var(--px-accent) 18%, transparent)",
                color: "var(--px-accent-strong)",
              }}
            >
              {category.name.charAt(0)}
            </span>
            <span className="font-semibold leading-snug text-foreground group-hover:text-accent-strong">{category.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function CategoriesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="status" aria-label="Ładowanie kategorii">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

async function NewProducts() {
  await connection()
  const result = await listProducts({ limit: 8, order: "-created_at" }).catch(() => null)
  if (!result) {
    return <p className="text-muted">Nie udało się wczytać produktów. Odśwież stronę za chwilę.</p>
  }
  if (result.products.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-muted">Pierwsze produkty pojawią się wkrótce.</p>
  }
  return <ProductGrid products={result.products} />
}

const benefits = [
  { icon: FlagDeIcon, title: "Oryginalne produkty", text: "Importujemy produkty z rynku niemieckiego." },
  { icon: ShieldIcon, title: "Bezpieczne zakupy", text: "Płatności przez sprawdzonych operatorów." },
  { icon: TruckIcon, title: "Dostawa w całej Polsce", text: "Kurierzy i punkty odbioru." },
]

export default function HomePage() {
  return (
    <>
      <Hero />
      <Container className="flex flex-col gap-14 py-12">
        <section aria-labelledby="categories-heading" className="flex flex-col gap-5">
          <h2 id="categories-heading" className="text-2xl font-bold md:text-3xl">
            Kategorie
          </h2>
          <Suspense fallback={<CategoriesSkeleton />}>
            <Categories />
          </Suspense>
        </section>

        <section aria-labelledby="new-heading" className="flex flex-col gap-5">
          <h2 id="new-heading" className="text-2xl font-bold md:text-3xl">
            Nowości
          </h2>
          <Suspense fallback={<ProductGridSkeleton count={4} />}>
            <NewProducts />
          </Suspense>
        </section>

        <section aria-label="Dlaczego PATRIX" className="grid gap-4 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4 rounded-lg bg-surface-muted p-5">
              <Icon className="shrink-0 text-accent-strong" />
              <div>
                <h3 className="font-sans text-base font-semibold">{title}</h3>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </section>
      </Container>
    </>
  )
}
