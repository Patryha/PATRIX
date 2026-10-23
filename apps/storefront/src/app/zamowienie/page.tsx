import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense, type ReactNode } from "react"
import { CartSummary } from "@/components/cart/cart-summary"
import { AddressForm, type AddressDefaults } from "@/components/checkout/address-form"
import { ChoiceForm } from "@/components/checkout/choice-form"
import { PlaceOrder } from "@/components/checkout/place-order"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { setPayment, setShipping } from "@/lib/actions/checkout"
import { retrieveCart } from "@/lib/data/cart"
import { listPaymentProviders, listShippingOptions } from "@/lib/data/checkout"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/cn"

export const metadata: Metadata = { title: "Zamówienie", robots: { index: false } }

function Step({ n, title, active, children }: { n: number; title: string; active: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby={`krok-${n}`} className={cn("rounded-lg border border-border bg-surface p-4 md:p-6", !active && "opacity-70")}>
      <h2 id={`krok-${n}`} className="mb-4 flex items-center gap-3 text-xl font-bold">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

async function Checkout() {
  const cart = await retrieveCart()
  if (!cart?.items?.length) {
    redirect("/koszyk")
  }
  const currency = cart.currency_code ?? "pln"
  const meta = (cart.metadata ?? {}) as Record<string, unknown>
  const addr = cart.shipping_address
  const defaults: AddressDefaults = {
    email: cart.email ?? undefined,
    first_name: addr?.first_name ?? undefined,
    last_name: addr?.last_name ?? undefined,
    phone: addr?.phone ?? undefined,
    address_1: addr?.address_1 ?? undefined,
    postal_code: addr?.postal_code ?? undefined,
    city: addr?.city ?? undefined,
    invoice: meta.invoice === true,
    company: typeof meta.company === "string" ? meta.company : undefined,
    nip: typeof meta.nip === "string" ? meta.nip : undefined,
  }
  const hasAddress = Boolean(cart.email && addr?.address_1)
  const shippingMethod = cart.shipping_methods?.[0]
  const session = cart.payment_collection?.payment_sessions?.[0]

  const [shippingOptions, providers] = await Promise.all([
    hasAddress ? listShippingOptions(cart.id) : Promise.resolve([]),
    shippingMethod ? listPaymentProviders(cart.region_id!) : Promise.resolve([]),
  ])

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        <Step n={1} title="Dane i adres dostawy" active>
          <AddressForm defaults={defaults} />
        </Step>
        <Step n={2} title="Dostawa" active={hasAddress}>
          {hasAddress ? (
            <ChoiceForm
              legend="Sposób dostawy"
              name="optionId"
              choices={shippingOptions.map((o) => ({
                id: o.id,
                label: o.name,
                detail: formatPrice(o.calculated_price?.calculated_amount ?? o.amount ?? 0, currency),
                disabled: o.insufficient_inventory,
              }))}
              selected={shippingMethod?.shipping_option_id ?? null}
              submitLabel="Wybierz dostawę"
              emptyText="Brak dostępnych form dostawy dla tego adresu. Skontaktuj się ze sklepem."
              action={setShipping}
            />
          ) : (
            <p className="text-muted">Najpierw podaj dane i adres dostawy.</p>
          )}
        </Step>
        <Step n={3} title="Płatność" active={Boolean(shippingMethod)}>
          {shippingMethod ? (
            <ChoiceForm
              legend="Sposób płatności"
              name="providerId"
              choices={providers.map((p) => ({ id: p.id, label: p.label }))}
              selected={session?.provider_id ?? null}
              submitLabel="Wybierz płatność"
              emptyText="Brak dostępnych metod płatności."
              action={setPayment}
            />
          ) : (
            <p className="text-muted">Najpierw wybierz sposób dostawy.</p>
          )}
        </Step>
      </div>
      <aside className="flex flex-col gap-4 self-start rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-36" aria-label="Podsumowanie zamówienia">
        <h2 className="text-lg font-bold">Podsumowanie</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {cart.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>
                {i.product_title ?? i.title}
                {i.variant_title ? `, ${i.variant_title}` : ""} × {i.quantity}
              </span>
              <span className="tabular-nums">{formatPrice(i.total ?? 0, currency)}</span>
            </li>
          ))}
        </ul>
        <CartSummary cart={cart} showShipping />
        {session ? (
          <PlaceOrder total={formatPrice(cart.total ?? 0, currency)} />
        ) : (
          <p className="text-sm text-muted">Uzupełnij dane, dostawę i płatność, aby złożyć zamówienie.</p>
        )}
        <Link href="/koszyk" className="text-center text-sm text-accent-strong underline">
          Wróć do koszyka
        </Link>
      </aside>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-extrabold">Zamówienie</h1>
      <Suspense
        fallback={
          <div role="status" aria-label="Ładowanie zamówienia" className="flex flex-col gap-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-32" />
          </div>
        }
      >
        <Checkout />
      </Suspense>
    </Container>
  )
}
