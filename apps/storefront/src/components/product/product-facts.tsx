import type { ReactNode } from "react"
import type { Compliance } from "@/lib/data/products"

const NUTRITION_ROWS: [string, string, string][] = [
  ["energy_kj", "Wartość energetyczna", "kJ"],
  ["energy_kcal", "", "kcal"],
  ["fat", "Tłuszcz", "g"],
  ["saturates", "w tym kwasy tłuszczowe nasycone", "g"],
  ["carbohydrate", "Węglowodany", "g"],
  ["sugars", "w tym cukry", "g"],
  ["protein", "Białko", "g"],
  ["salt", "Sól", "g"],
]

const PICTOGRAM_NAMES: Record<string, string> = {
  GHS01: "Materiał wybuchowy",
  GHS02: "Materiał łatwopalny",
  GHS03: "Materiał utleniający",
  GHS04: "Gaz pod ciśnieniem",
  GHS05: "Działanie żrące",
  GHS06: "Toksyczność ostra",
  GHS07: "Działanie drażniące lub szkodliwe",
  GHS08: "Zagrożenie dla zdrowia",
  GHS09: "Zagrożenie dla środowiska",
}

const SIGNAL_WORD = { warning: "Uwaga", danger: "Niebezpieczeństwo" } as const

const number = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 })

function Block({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-border py-3" open={open}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold marker:hidden">
        {title}
        <span aria-hidden className="text-muted transition-transform duration-200 group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="flex flex-col gap-2 pt-2 text-foreground">{children}</div>
    </details>
  )
}

/** Dane z etykiety i informacje wymagane prawem (pokazywane tylko po weryfikacji w panelu). */
export function ProductFacts({ compliance, description }: { compliance: Compliance | null; description: string | null }) {
  const c = compliance
  const hasClp = c?.clp_signal_word === "warning" || c?.clp_signal_word === "danger"
  return (
    <section aria-label="Informacje o produkcie" className="flex flex-col border-t border-border">
      {description ? (
        <Block title="Opis" open>
          <p className="whitespace-pre-line">{description}</p>
        </Block>
      ) : null}

      {c?.ingredients ? (
        <Block title={c.product_kind === "cosmetic" ? "Składniki (INCI)" : "Skład"}>
          <p className="whitespace-pre-line">{c.ingredients}</p>
          {c.product_kind === "food" ? (
            <p className="text-sm">
              <strong>Alergeny:</strong> {c.allergens?.length ? c.allergens.join(", ") : "nie zawiera alergenów wymienionych na etykiecie"}
            </p>
          ) : null}
        </Block>
      ) : null}

      {c?.product_kind === "food" && c.nutrition ? (
        <Block title="Wartości odżywcze">
          <table className="w-full max-w-md text-sm">
            <caption className="sr-only">Wartości odżywcze w 100 g lub 100 ml</caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-1 font-semibold">
                  Składnik
                </th>
                <th scope="col" className="py-1 text-right font-semibold">
                  w 100 g/ml
                </th>
              </tr>
            </thead>
            <tbody>
              {NUTRITION_ROWS.map(([key, label, unit]) => {
                const value = c.nutrition?.[key]
                if (value === null || value === undefined) {
                  return null
                }
                return (
                  <tr key={key} className="border-b border-border/60">
                    <th scope="row" className="py-1 text-left font-normal">
                      {label || <span className="sr-only">Wartość energetyczna</span>}
                    </th>
                    <td className="py-1 text-right tabular-nums">
                      {number.format(value)} {unit}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Block>
      ) : null}

      {c && (hasClp || c.warnings || c.usage_instructions || c.storage_conditions) ? (
        <Block title="Stosowanie i bezpieczeństwo">
          {hasClp ? (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3">
              <p className="font-bold uppercase">{SIGNAL_WORD[c.clp_signal_word as "warning" | "danger"]}</p>
              {c.clp_pictograms?.length ? (
                <ul className="flex flex-wrap gap-2 text-sm" aria-label="Piktogramy zagrożenia">
                  {c.clp_pictograms.map((p) => (
                    <li key={p} className="rounded border border-border bg-surface px-2 py-1">
                      {p}: {PICTOGRAM_NAMES[p] ?? p}
                    </li>
                  ))}
                </ul>
              ) : null}
              {c.clp_hazard_statements?.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {c.clp_hazard_statements.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
              {c.clp_precautionary_statements?.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {c.clp_precautionary_statements.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
              {c.ufi_code ? <p className="text-sm">UFI: {c.ufi_code}</p> : null}
            </div>
          ) : null}
          {c.warnings ? (
            <p className="whitespace-pre-line">
              <strong>Ostrzeżenia:</strong> {c.warnings}
            </p>
          ) : null}
          {c.usage_instructions ? (
            <p className="whitespace-pre-line">
              <strong>Sposób użycia:</strong> {c.usage_instructions}
            </p>
          ) : null}
          {c.storage_conditions ? (
            <p className="whitespace-pre-line">
              <strong>Przechowywanie:</strong> {c.storage_conditions}
            </p>
          ) : null}
          {c.cosmetic_pao_months ? <p>Okres trwałości po otwarciu: {c.cosmetic_pao_months} mies.</p> : null}
        </Block>
      ) : null}

      {c?.manufacturer_name ? (
        <Block title="Producent i bezpieczeństwo produktu">
          <dl className="grid gap-2 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
            <dt className="font-semibold">Producent</dt>
            <dd className="whitespace-pre-line">
              {c.manufacturer_name}
              {c.manufacturer_address ? `\n${c.manufacturer_address}` : ""}
              {c.manufacturer_contact ? `\n${c.manufacturer_contact}` : ""}
            </dd>
            {c.eu_responsible_name ? (
              <>
                <dt className="font-semibold">Podmiot odpowiedzialny w UE</dt>
                <dd className="whitespace-pre-line">
                  {c.eu_responsible_name}
                  {c.eu_responsible_address ? `\n${c.eu_responsible_address}` : ""}
                </dd>
              </>
            ) : null}
            {c.country_of_origin ? (
              <>
                <dt className="font-semibold">Kraj pochodzenia</dt>
                <dd>{c.country_of_origin}</dd>
              </>
            ) : null}
            {c.name_original ? (
              <>
                <dt className="font-semibold">Nazwa oryginalna</dt>
                <dd lang="de">{c.name_original}</dd>
              </>
            ) : null}
          </dl>
        </Block>
      ) : null}
    </section>
  )
}
