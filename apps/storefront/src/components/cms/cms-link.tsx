import Link from "next/link"
import type { ComponentProps } from "react"
import { isInternal } from "@/lib/cms/types"

/** Link z treści CMS: wewnętrzny przez next/link, zewnętrzny w nowej karcie z rel="noopener". */
export function CmsLink({ href, children, ...props }: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  if (isInternal(href)) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <span className="sr-only"> (otwiera się w nowej karcie)</span>
    </a>
  )
}
