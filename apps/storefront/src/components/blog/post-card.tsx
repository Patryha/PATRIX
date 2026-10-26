import Image from "next/image"
import Link from "next/link"
import { displayableImage } from "@/lib/config"
import type { BlogPostSummary } from "@/lib/data/blog"
import { formatDate } from "@/lib/format"

export function BlogPostCard({ post, priority = false }: { post: BlogPostSummary; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[box-shadow,transform,border-color] duration-200 ease-patrix hover:-translate-y-0.5 hover:border-accent hover:shadow-lg focus-within:border-accent">
      {displayableImage(post.cover_url) ? (
        <div className="relative aspect-[16/9] bg-surface-muted">
          <Image src={post.cover_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" priority={priority} />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <time dateTime={post.published_at} className="text-sm text-muted">
          {formatDate(post.published_at)}
        </time>
        <h2 className="font-sans text-lg font-semibold leading-snug">
          {/* Rozciągnięty link: cała karta jest klikalna, a czytnik ekranu ogłasza tylko tytuł. */}
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </h2>
        <p className="line-clamp-3 text-sm text-muted">{post.excerpt}</p>
      </div>
    </article>
  )
}
