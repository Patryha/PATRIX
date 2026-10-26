import { CmsLink } from "@/components/cms/cms-link"
import { ConsentSettingsButton } from "@/components/consent/consent-manager"
import { Container } from "@/components/ui/container"
import type { LayoutContent } from "@/lib/cms/layout"
import { trackingConfig } from "@/lib/consent"
import { getLayout } from "@/lib/data/cms"
import { Logo } from "./logo"

/**
 * Stopka z CMS (panel: Menu i stopka). Dane kontaktowe pokazujemy tylko, gdy wpisał je właściciel.
 * `preview`: szkic w podglądzie, jako sekcja (strona ma już własną stopkę).
 */
export function FooterContent({ footer, preview = false }: { footer: LayoutContent["footer"]; preview?: boolean }) {
  const Root = preview ? "section" : "footer"
  const { contact } = footer
  const hasContact = !!(contact.email || contact.phone || contact.hours)
  return (
    <Root aria-label={preview ? "Stopka (szkic)" : undefined} className="mt-16 border-t border-border bg-surface">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo />
          {footer.about ? <p className="max-w-xs text-sm text-muted">{footer.about}</p> : null}
          {hasContact ? (
            <address className="flex flex-col gap-1 text-sm not-italic">
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="text-muted hover:text-accent-strong">
                  {contact.email}
                </a>
              ) : null}
              {contact.phone ? (
                <a href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`} className="text-muted hover:text-accent-strong">
                  {contact.phone}
                </a>
              ) : null}
              {contact.hours ? <span className="text-muted">{contact.hours}</span> : null}
            </address>
          ) : null}
        </div>
        {footer.columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2 text-sm">
            <h2 className="font-display text-base font-bold">{column.title}</h2>
            {column.links.map((link) => (
              <CmsLink key={`${link.href}-${link.label}`} href={link.href} className="text-muted hover:text-accent-strong">
                {link.label}
              </CmsLink>
            ))}
          </nav>
        ))}
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-1 py-4 text-xs text-muted sm:flex-row sm:justify-between">
          <span>© PATRIX</span>
          {footer.note ? <span>{footer.note}</span> : null}
          {preview ? null : <ConsentSettingsButton config={trackingConfig} />}
        </Container>
      </div>
    </Root>
  )
}

export async function Footer() {
  const layout = await getLayout()
  return <FooterContent footer={layout.footer} />
}
