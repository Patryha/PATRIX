import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { BlogPostCard } from "@/components/blog/post-card"
import { buttonClasses } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { BLOG_PAGE_SIZE, listBlogPosts } from "@/lib/data/blog"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const pageOf = (value: string | string[] | undefined) => {
  const n = typeof value === "string" && /^\d{1,4}$/.test(value) ? Number(value) : 1
  return Math.max(1, n)
}
const pageHref = (page: number) => (page > 1 ? `/blog?strona=${page}` : "/blog")

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = pageOf((await searchParams).strona)
  const { count } = await listBlogPosts(1).catch(() => ({ count: 0 }))
  return {
    title: page > 1 ? `Blog – strona ${page}` : "Blog",
    description: "Poradniki i nowości PATRIX: jak używać produktów z Niemiec na co dzień.",
    alternates: { canonical: pageHref(page) },
    // Pusty blog nie trafia do wyszukiwarek.
    robots: count ? undefined : { index: false },
  }
}

async function BlogList({ searchParams }: Props) {
  const page = pageOf((await searchParams).strona)
  const { posts, count } = await listBlogPosts(page)
  const pages = Math.max(1, Math.ceil(count / BLOG_PAGE_SIZE))
  if (page > pages) {
    notFound()
  }
  if (!posts.length) {
    return <p className="text-muted">Pierwsze wpisy pojawią się wkrótce.</p>
  }
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <BlogPostCard post={post} priority={i < 3} />
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <nav aria-label="Strony bloga" className="flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={buttonClasses({ variant: "secondary", size: "sm" })} rel="prev">
              Poprzednia
            </Link>
          ) : null}
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              aria-current={n === page ? "page" : undefined}
              className={buttonClasses({ variant: n === page ? "accent" : "secondary", size: "sm", className: "min-w-9" })}
            >
              {n}
            </Link>
          ))}
          {page < pages ? (
            <Link href={pageHref(page + 1)} className={buttonClasses({ variant: "secondary", size: "sm" })} rel="next">
              Następna
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  )
}

export default function BlogPage(props: Props) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <nav aria-label="Ścieżka nawigacji" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent-strong">
              Strona główna
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            Blog
          </li>
        </ol>
      </nav>
      <h1 className="text-3xl font-extrabold md:text-4xl">Blog</h1>
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Ładowanie wpisów">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        }
      >
        <BlogList {...props} />
      </Suspense>
    </Container>
  )
}
