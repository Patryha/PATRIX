import type { AnnouncementBar as Props } from "@/lib/cms/types"
import { CmsLink } from "./cms-link"

export function AnnouncementBar({ section }: { section: Props }) {
  return (
    <aside aria-label="Informacje sklepu" className="bg-primary text-primary-foreground">
      <ul className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2 text-center text-sm font-medium md:px-8">
        {section.messages.map((m, i) => (
          <li key={i}>
            {m.href ? (
              <CmsLink href={m.href} className="underline underline-offset-2 hover:no-underline">
                {m.text}
              </CmsLink>
            ) : (
              m.text
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}
