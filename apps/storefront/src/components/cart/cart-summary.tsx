import type { HttpTypes } from "@medusajs/types";
import { formatPrice } from "@/lib/format";

/** Podsumowanie kwot koszyka (ceny brutto, z VAT). */
export function CartSummary({
  cart,
  showShipping = false,
}: {
  cart: HttpTypes.StoreCart;
  showShipping?: boolean;
}) {
  const currency = cart.currency_code ?? "pln";
  const rows: [string, number, string?][] = [
    ["Wartość produktów", cart.item_total ?? 0],
  ];
  if ((cart.discount_total ?? 0) > 0) {
    rows.push(["Rabat", -(cart.discount_total ?? 0), "text-accent-strong"]);
  }
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([label, value, cls]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt>{label}</dt>
            <dd className={`tabular-nums ${cls ?? ""}`}>
              {formatPrice(value, currency)}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-4">
          <dt>Dostawa</dt>
          <dd className="tabular-nums">
            {showShipping && cart.shipping_methods?.length
              ? formatPrice(cart.shipping_total ?? 0, currency)
              : "obliczona przy wyborze dostawy"}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-bold">
          <dt>Do zapłaty</dt>
          <dd className="tabular-nums">
            {formatPrice(cart.total ?? 0, currency)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted">
        Ceny zawierają podatek VAT
        {(cart.tax_total ?? 0) > 0
          ? ` (${formatPrice(cart.tax_total ?? 0, currency)})`
          : ""}
        .
      </p>
    </div>
  );
}
