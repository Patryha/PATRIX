import Image from "next/image"
import Link from "next/link"
import { Suspense, type ComponentType } from "react"
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-card"
import { buttonClasses } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { BoxIcon, CardIcon, FlagDeIcon, ReturnIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { canOptimize } from "@/lib/cms/images"
import type { BrandStory, CategoryTiles, InfoIcon, InfoTiles, ProductRail as ProductRailProps, RecentlyViewed as RecentlyViewedProps, Section } from "@/lib/cms/types"
import { getCategoryByHandle, listTopCategories, type Category } from "@/lib/data/categories"
import { listBestsellerIds } from "@/lib/data/cms"
import { listCatalog, listProducts, listProductsByHandles, type ProductSummary } from "@/lib/data/products"
import { AnnouncementBar } from "./announcement-bar"
import { CmsLink } from "./cms-link"
import { HeroSlider } from "./hero-slider"
import { RecentlyViewed } from "./recently-viewed"

function SectionHeading({ id, title, link }: { id: string; title: string; link?: { label?: string; href?: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 id={id} className="text-2xl font-bold md:text-3xl">
        {title}
      </h2>
      {link?.label && link.href ? (
        <CmsLink href={link.href} className="font-semibold text-accent-strong underline-offset-4 hover:underline">
          {link.label}
        </CmsLink>
      ) : null}
    </div>
  )
}

async function CategoryTilesList({ section }: { section: CategoryTiles }) {
  const categories: Category[] = section.category_handles.length
    ? (await Promise.all(section.category_handles.map((h) => getCategoryByHandle(h).catch(() => null)))).filter((c): c is Category => !!c)
    : await listTopCategories().catch(() => [])
  if (!categories.length) {
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

function TilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="status" aria-label="Ładowanie kategorii">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

async function railProducts(section: ProductRailProps): Promise<ProductSummary[]> {
  switch (section.source) {
    case "newest":
      return (await listProducts({ limit: section.limit, order: "-created_at" })).products
    case "category": {
      const category = section.category_handle ? await getCategoryByHandle(section.category_handle) : null
      return category ? (await listProducts({ categoryId: category.id, limit: section.limit })).products : []
    }
    case "products":
      return (await listProductsByHandles(section.product_handles ?? [])).slice(0, section.limit)
    case "bestsellers": {
      const ids = await listBestsellerIds(section.limit)
      const products = await listCatalog({ ids })
      const byId = new Map(products.map((p) => [p.id, p]))
      return ids.map((id) => byId.get(id)).filter((p): p is ProductSummary => !!p)
    }
    case "on_sale":
      // Obniżka = cena z cennika niższa od regularnej. Karta pokazuje tylko cenę bieżącą (Omnibus: cena sprzed obniżki z 30 dni na karcie produktu).
      return (await listCatalog({})).filter((p) => p.price?.original != null).slice(0, section.limit)
  }
}

/** Karuzela produktów. Gdy źródło nie zwraca produktów, sekcja znika (bez pustych ramek). */
async function ProductRail({ section }: { section: ProductRailProps }) {
  const products = await railProducts(section).catch(() => null)
  if (!products?.length) {
    return null
  }
  const id = `sekcja-${section.id}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <SectionHeading id={id} title={section.title} link={{ label: section.link_label, href: section.link_href }} />
      <ProductGrid products={products} />
    </section>
  )
}

function BrandStorySection({ section }: { section: BrandStory }) {
  const id = `sekcja-${section.id}`
  return (
    <section aria-labelledby={id} className="grid items-center gap-8 rounded-xl bg-surface-muted p-6 md:grid-cols-2 md:p-10">
      <div className="flex flex-col gap-4">
        <h2 id={id} className="text-2xl font-bold md:text-3xl">
          {section.title}
        </h2>
        {section.text.split(/\n{2,}/).map((p, i) => (
          <p key={i} className="max-w-prose text-lg leading-relaxed">
            {p}
          </p>
        ))}
        {section.cta_label && section.cta_href ? (
          <CmsLink href={section.cta_href} className={`${buttonClasses({ variant: "primary" })} w-fit`}>
            {section.cta_label}
          </CmsLink>
        ) : null}
      </div>
      {section.image_url ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
          <Image src={section.image_url} unoptimized={!canOptimize(section.image_url)} alt={section.image_alt ?? ""} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
        </div>
      ) : null}
    </section>
  )
}

const ICONS: Record<InfoIcon, ComponentType<{ width?: number; height?: number }>> = {
  truck: TruckIcon,
  shield: ShieldIcon,
  flag: FlagDeIcon,
  card: CardIcon,
  return: ReturnIcon,
  box: BoxIcon,
}

function InfoTilesSection({ section }: { section: InfoTiles }) {
  const id = `sekcja-${section.id}`
  return (
    <section aria-labelledby={section.title ? id : undefined} aria-label={section.title ? undefined : "Informacje o zakupach"} className="flex flex-col gap-5">
      {section.title ? <SectionHeading id={id} title={section.title} /> : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item, i) => {
          const Icon = ICONS[item.icon] ?? BoxIcon
          const body = (
            <>
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-accent-strong">
                <Icon width={22} height={22} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{item.title}</span>
                <span className="text-sm text-muted">{item.text}</span>
              </span>
            </>
          )
          return (
            <li key={i}>
              {item.href ? (
                <CmsLink href={item.href} className="flex h-full gap-3 rounded-lg border border-border bg-surface p-4 hover:border-accent">
                  {body}
                </CmsLink>
              ) : (
                <div className="flex h-full gap-3 rounded-lg border border-border bg-surface p-4">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RecentlyViewedSection({ section }: { section: RecentlyViewedProps }) {
  return <RecentlyViewed title={section.title} id={`sekcja-${section.id}`} />
}

/** Renderuje sekcje strony głównej w kolejności z panelu. Pasek informacyjny i slider są na pełną szerokość. */
export function CmsSections({ sections }: { sections: Section[] }) {
  const firstHero = sections.findIndex((s) => s.type === "hero_slider")
  const top = sections.filter((s) => s.type === "announcement_bar")
  const rest = sections.filter((s) => s.type !== "announcement_bar")
  const hasH1 = firstHero >= 0
  return (
    <>
      {top.map((s) => s.type === "announcement_bar" && <AnnouncementBar key={s.id} section={s} />)}
      {!hasH1 ? <h1 className="sr-only">PATRIX: niemiecka jakość na co dzień</h1> : null}
      {rest.map((s, i) => {
        if (s.type === "hero_slider") {
          return <HeroSlider key={s.id} section={s} headingLevel={s === sections[firstHero] ? 1 : 2} />
        }
        const inner = (() => {
          switch (s.type) {
            case "category_tiles": {
              const id = `sekcja-${s.id}`
              return (
                <section aria-labelledby={id} className="flex flex-col gap-5">
                  <SectionHeading id={id} title={s.title} />
                  <Suspense fallback={<TilesSkeleton />}>
                    <CategoryTilesList section={s} />
                  </Suspense>
                </section>
              )
            }
            case "product_rail":
              return (
                <Suspense fallback={<ProductGridSkeleton count={Math.min(s.limit, 4)} />}>
                  <ProductRail section={s} />
                </Suspense>
              )
            case "brand_story":
              return <BrandStorySection section={s} />
            case "info_tiles":
              return <InfoTilesSection section={s} />
            case "recently_viewed":
              return <RecentlyViewedSection section={s} />
          }
        })()
        return (
          <Container key={s.id} className={i === 0 ? "pt-12" : "pt-14"}>
            {inner}
          </Container>
        )
      })}
      <div className="pb-14" />
    </>
  )
}
