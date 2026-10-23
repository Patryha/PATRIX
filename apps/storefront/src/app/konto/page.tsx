import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { buttonClasses } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { logout } from "@/lib/actions/account"
import { listCustomerOrders, retrieveCustomer } from "@/lib/data/customer"
import { formatPrice } from "@/lib/format"

export const metadata: Metadata = { title: "Moje konto", robots: { index: false } }

const STATUS: Record<string, string> = {
  pending: "Przyjęte",
  completed: "Zrealizowane",
  canceled: "Anulowane",
  archived: "Zarchiwizowane",
  requires_action: "Wymaga działania",
  draft: "Szkic",
}

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" })

async function Account() {
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect("/logowanie?next=/konto")
  }
  const orders = await listCustomerOrders()
  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <section aria-labelledby="dane" className="flex flex-col gap-3 self-start rounded-lg border border-border bg-surface p-4">
        <h2 id="dane" className="text-lg font-bold">
          Twoje dane
        </h2>
        <p>
          {customer.first_name} {customer.last_name}
          <br />
          <span className="text-muted">{customer.email}</span>
        </p>
        <form action={logout}>
          <button type="submit" className={buttonClasses({ variant: "secondary" })}>
            Wyloguj się
          </button>
        </form>
      </section>
      <section aria-labelledby="zamowienia" className="flex flex-col gap-3">
        <h2 id="zamowienia" className="text-xl font-bold">
          Zamówienia
        </h2>
        {orders.length ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Historia zamówień</caption>
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className="p-3">
                    Numer
                  </th>
                  <th scope="col" className="p-3">
                    Data
                  </th>
                  <th scope="col" className="p-3">
                    Produkty
                  </th>
                  <th scope="col" className="p-3">
                    Status
                  </th>
                  <th scope="col" className="p-3 text-right">
                    Kwota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-3 font-semibold">{o.display_id}</td>
                    <td className="p-3">{dateFormat.format(new Date(o.created_at))}</td>
                    <td className="p-3">{o.items?.reduce((n, i) => n + i.quantity, 0) ?? 0} szt.</td>
                    <td className="p-3">{STATUS[o.status] ?? o.status}</td>
                    <td className="p-3 text-right tabular-nums">{formatPrice(o.total ?? 0, o.currency_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-muted">Nie masz jeszcze zamówień.</p>
        )}
      </section>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-extrabold">Moje konto</h1>
      <Suspense fallback={<Skeleton className="h-48" />}>
        <Account />
      </Suspense>
    </Container>
  )
}
