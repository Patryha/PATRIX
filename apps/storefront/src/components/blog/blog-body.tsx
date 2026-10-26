import Link from "next/link"
import { parseBlogBody, type Inline } from "@/lib/blog-markup"

function InlineContent({ parts }: { parts: Inline[] }) {
  return parts.map((part, i) => {
    if (part.type === "strong") {
      return <strong key={i}>{part.text}</strong>
    }
    if (part.type === "link") {
      const className = "font-medium text-accent-strong underline underline-offset-2 hover:no-underline"
      return part.href.startsWith("/") ? (
        <Link key={i} href={part.href} className={className}>
          {part.text}
        </Link>
      ) : (
        <a key={i} href={part.href} className={className} rel="noopener noreferrer">
          {part.text}
        </a>
      )
    }
    return <span key={i}>{part.text}</span>
  })
}

/** Treść wpisu bloga: tylko elementy z formatu wpisu, bez HTML z bazy. */
export function BlogBody({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-4 text-base leading-relaxed">
      {parseBlogBody(body).map((block, i) => {
        if (block.type === "heading") {
          const Tag = block.level === 2 ? "h2" : "h3"
          return (
            <Tag key={i} className={block.level === 2 ? "pt-4 text-2xl font-bold" : "pt-2 text-xl font-semibold"}>
              <InlineContent parts={block.content} />
            </Tag>
          )
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1 pl-6">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineContent parts={item} />
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 ? <br /> : null}
                <InlineContent parts={line} />
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
