import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { BlogBody } from "@/components/blog/blog-body"
import { ProductGrid } from "@/components/product/product-card"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { readingMinutes } from "@/lib/blog-markup"
import { displayableImage, siteUrl } from "@/lib/config"
import { getBlogPost } from "@/lib/data/blog"
import { listProductsByHandles } from "@/lib/data/products"
import { formatDate } from "@/lib/format"
import { breadcrumbJsonLd, jsonLd } from "@/lib/seo/json-ld"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost((await params).slug).catch(() => null)
  if (!post) {
    return { title: "Nie znaleziono wpisu" }
  }
  const image = displayableImage(post.cover_url) ? new URL(post.cover_url, siteUrl).toString() : undefined
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      images: image ? [{ url: image, alt: post.cover_alt ?? "" }] : undefined,
    },
  }
}

async function RelatedProducts({ handles }: { handles: string[] }) {
  const products = await listProductsByHandles(handles).catch(() => [])
  if (!products.length) {
    return null
  }
  return (
    <section aria-labelledby="produkty-we-wpisie" className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 id="produkty-we-wpisie" className="text-2xl font-bold">
        Produkty z tego wpisu
      </h2>
      <ProductGrid products={products} />
    </section>
  )
}

async function PostContent({ params }: Props) {
  const post = await getBlogPost((await params).slug)
  if (!post) {
    notFound()
  }
  const url = `${siteUrl}/blog/${post.slug}`
  const cover = displayableImage(post.cover_url) ? post.cover_url : null
  const crumbs = [
    { name: "Strona główna", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ]
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    mainEntityOfPage: url,
    image: cover ? [new URL(cover, siteUrl).toString()] : undefined,
    publisher: { "@type": "Organization", name: "PATRIX", url: siteUrl },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd(crumbs, siteUrl)) }} />
      <nav aria-label="Ścieżka nawigacji" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="text-foreground">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="hover:text-accent-strong">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-extrabold md:text-4xl">{post.title}</h1>
          <p className="text-sm text-muted">
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            <span aria-hidden> · </span>
            {readingMinutes(post.body)} min czytania
          </p>
          <p className="text-lg text-muted">{post.excerpt}</p>
        </header>
        {cover ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface-muted">
            <Image src={cover} alt={post.cover_alt ?? ""} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" loading="eager" fetchPriority="high" />
          </div>
        ) : null}
        <BlogBody body={post.body} />
      </article>
      {post.product_handles.length ? (
        <Suspense fallback={null}>
          <RelatedProducts handles={post.product_handles} />
        </Suspense>
      ) : null}
    </>
  )
}

export default function BlogPostPage(props: Props) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-3" role="status" aria-label="Ładowanie wpisu">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        <PostContent {...props} />
      </Suspense>
    </Container>
  )
}
