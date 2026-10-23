import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { buttonClasses } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { PAYMENT_LABELS } from "@/lib/data/checkout"
import { formatPrice } from "@/lib/format"
import { sdk } from "@/lib/medusa"
import { authHeaders, getLastOrderId } from "@/lib/session"

export const metadata: Metadata = { title: "Potwierdzenie zamówienia", robots: { index: false } }

const ORDER_FIELDS =
  "id,display_id,email,currency_code,total,item_total,shipping_total,discount_total,tax_total," +
  "*items,items.product_title,items.variant_title,items.quantity,items.total,*shipping_address,*billing_address,*shipping_methods," +
  "*payment_collections,*payment_collections.payment_sessions"

async function Confirmation() {
  const orderId = await getLastOrderId()
  const order = orderId
    ? await sdk.store.order
        .retrieve(orderId, { fields: ORDER_FIELDS }, await authHeaders())
        .then((r) => r.order)
        .catch(() => null)
    : null
  if (!order) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p>Nie znaleziono zamówienia do wyświetlenia. Potwierdzenie jest dostępne przez godzinę w przeglądarce, w której złożono zamówienie.</p>
        <Link href="/" className={buttonClasses({ variant: "accent" })}>
          Przejdź do sklepu
        </Link>
      </div>
    )
  }
  const currency = order.currency_code ?? "pln"
  const addr = order.shipping_address
  const billing = order.billing_address
  const nip = (billing?.metadata as Record<string, unknown> | null)?.nip
  const provider = order.payment_collections?.[0]?.payment_sessions?.[0]?.provider_id
  return (
    <div className="flex flex-col gap-6">
      <div role="status" className="rounded-lg border border-success bg-surface p-4 md:p-6">
        <p className="text-xl font-bold">Dziękujemy! Przyjęliśmy zamówienie nr {order.display_id}.</p>
        <p className="mt-1 text-muted">Zapisz numer zamówienia. Podany adres e-mail: {order.email}.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="produkty" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 id="produkty" className="text-lg font-bold">
            Produkty
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {order.items?.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span>
                  {i.product_title ?? i.title}
                  {i.variant_title ? `, ${i.variant_title}` : ""} × {i.quantity}
                </span>
                <span className="tabular-nums">{formatPrice(i.total ?? 0, currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
            {(order.discount_total ?? 0) > 0 ? (
              <div className="flex justify-between">
                <dt>Rabat</dt>
                <dd className="tabular-nums">{formatPrice(-(order.discount_total ?? 0), currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Dostawa</dt>
              <dd className="tabular-nums">{formatPrice(order.shipping_total ?? 0, currency)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Do zapłaty</dt>
              <dd className="tabular-nums">{formatPrice(order.total ?? 0, currency)}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="dostawa" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 text-sm">
          <h2 id="dostawa" className="text-lg font-bold">
            Dostawa i płatność
          </h2>
          {addr ? (
            <address className="not-italic">
              {addr.first_name} {addr.last_name}
              <br />
              {addr.address_1}
              <br />
              {addr.postal_code} {addr.city}
              <br />
              tel. {addr.phone}
            </address>
          ) : null}
          <p>Dostawa: {order.shipping_methods?.map((m) => m.name).join(", ")}</p>
          <p>Płatność: {(provider && PAYMENT_LABELS[provider]) ?? "—"}</p>
          {billing?.company && typeof nip === "string" ? (
            <p>
              Faktura na firmę: {billing.company}, NIP {nip}
            </p>
          ) : null}
        </section>
      </div>
      <Link href="/" className={`${buttonClasses({ variant: "secondary" })} self-start`}>
        Kontynuuj zakupy
      </Link>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-extrabold">Potwierdzenie zamówienia</h1>
      <Suspense fallback={<Skeleton className="h-48" />}>
        <Confirmation />
      </Suspense>
    </Container>
  )
}
