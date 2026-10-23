import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Checkbox, Container, Heading, Input, Label, Select, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"
import { sdk } from "../lib/sdk"

type Issue = { field: string; message: string }
type Report = { complete: boolean; missing: Issue[]; warnings: Issue[] }
type Brand = { id: string; name: string }
type Compliance = Record<string, unknown> & { data_status?: string; reviewed_at?: string | null }

const KINDS = [
  { value: "general", label: "Ogólny" },
  { value: "food", label: "Żywność / napoje" },
  { value: "household_chemical", label: "Chemia gospodarcza / detergenty" },
  { value: "cosmetic", label: "Kosmetyk" },
]
const UNITS = ["g", "kg", "ml", "l", "szt", "pranie"]
const NUTRITION = [
  ["energy_kj", "Energia (kJ)"],
  ["energy_kcal", "Energia (kcal)"],
  ["fat", "Tłuszcz (g)"],
  ["saturates", "w tym kwasy nasycone (g)"],
  ["carbohydrate", "Węglowodany (g)"],
  ["sugars", "w tym cukry (g)"],
  ["protein", "Białko (g)"],
  ["salt", "Sól (g)"],
] as const
const PICTOGRAMS = ["GHS01", "GHS02", "GHS03", "GHS04", "GHS05", "GHS06", "GHS07", "GHS08", "GHS09"]
const STATUS_LABEL: Record<string, string> = { draft: "Szkic", needs_review: "Do uzupełnienia", verified: "Kompletne" }

type Form = {
  brand_id: string
  product_kind: string
  name_original: string
  manufacturer_name: string
  manufacturer_address: string
  manufacturer_contact: string
  manufacturer_in_eu: boolean
  eu_responsible_name: string
  eu_responsible_address: string
  country_of_origin: string
  net_quantity: string
  net_quantity_unit: string
  ingredients: string
  allergens: string
  allergens_confirmed: boolean
  nutrition: Record<string, string>
  storage_conditions: string
  usage_instructions: string
  warnings: string
  clp_signal_word: string
  clp_hazard_statements: string
  clp_precautionary_statements: string
  clp_pictograms: string[]
  ufi_code: string
  cosmetic_pao_months: string
  cosmetic_function: string
  polish_label_verified: boolean
  internal_notes: string
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v))
const list = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "")
const toList = (v: string) => {
  const items = v.split(/\n|;/).map((s) => s.trim()).filter(Boolean)
  return items.length ? items : null
}
const toText = (v: string) => (v.trim() ? v.trim() : null)
const toNumber = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")))

function toForm(c: Compliance | null): Form {
  const nutrition = (c?.nutrition ?? {}) as Record<string, unknown>
  return {
    brand_id: str(c?.brand_id),
    product_kind: str(c?.product_kind) || "general",
    name_original: str(c?.name_original),
    manufacturer_name: str(c?.manufacturer_name),
    manufacturer_address: str(c?.manufacturer_address),
    manufacturer_contact: str(c?.manufacturer_contact),
    manufacturer_in_eu: c?.manufacturer_in_eu !== false,
    eu_responsible_name: str(c?.eu_responsible_name),
    eu_responsible_address: str(c?.eu_responsible_address),
    country_of_origin: str(c?.country_of_origin),
    net_quantity: str(c?.net_quantity),
    net_quantity_unit: str(c?.net_quantity_unit),
    ingredients: str(c?.ingredients),
    allergens: list(c?.allergens),
    allergens_confirmed: c?.allergens_confirmed === true,
    nutrition: Object.fromEntries(NUTRITION.map(([k]) => [k, str(nutrition[k])])),
    storage_conditions: str(c?.storage_conditions),
    usage_instructions: str(c?.usage_instructions),
    warnings: str(c?.warnings),
    clp_signal_word: str(c?.clp_signal_word),
    clp_hazard_statements: list(c?.clp_hazard_statements),
    clp_precautionary_statements: list(c?.clp_precautionary_statements),
    clp_pictograms: Array.isArray(c?.clp_pictograms) ? (c!.clp_pictograms as string[]) : [],
    ufi_code: str(c?.ufi_code),
    cosmetic_pao_months: str(c?.cosmetic_pao_months),
    cosmetic_function: str(c?.cosmetic_function),
    polish_label_verified: c?.polish_label_verified === true,
    internal_notes: str(c?.internal_notes),
  }
}

function toPayload(f: Form) {
  const nutritionEntries = NUTRITION.map(([k]) => [k, toNumber(f.nutrition[k] ?? "")] as const)
  const hasNutrition = nutritionEntries.some(([, v]) => v !== null)
  return {
    brand_id: f.brand_id || null,
    product_kind: f.product_kind,
    name_original: toText(f.name_original),
    manufacturer_name: toText(f.manufacturer_name),
    manufacturer_address: toText(f.manufacturer_address),
    manufacturer_contact: toText(f.manufacturer_contact),
    manufacturer_in_eu: f.manufacturer_in_eu,
    eu_responsible_name: toText(f.eu_responsible_name),
    eu_responsible_address: toText(f.eu_responsible_address),
    country_of_origin: toText(f.country_of_origin),
    net_quantity: toNumber(f.net_quantity),
    net_quantity_unit: f.net_quantity_unit || null,
    ingredients: toText(f.ingredients),
    allergens: toList(f.allergens),
    allergens_confirmed: f.allergens_confirmed,
    nutrition: hasNutrition ? Object.fromEntries(nutritionEntries) : null,
    storage_conditions: toText(f.storage_conditions),
    usage_instructions: toText(f.usage_instructions),
    warnings: toText(f.warnings),
    clp_signal_word: f.clp_signal_word || null,
    clp_hazard_statements: toList(f.clp_hazard_statements),
    clp_precautionary_statements: toList(f.clp_precautionary_statements),
    clp_pictograms: f.clp_pictograms.length ? f.clp_pictograms : null,
    ufi_code: toText(f.ufi_code),
    cosmetic_pao_months: toNumber(f.cosmetic_pao_months),
    cosmetic_function: toText(f.cosmetic_function),
    polish_label_verified: f.polish_label_verified,
    internal_notes: toText(f.internal_notes),
  }
}

function Field({ label, hint, children, id }: { label: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-y-1">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      {children}
      {hint && (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-y-3 px-6 py-4">
      <legend className="sr-only">{title}</legend>
      <Heading level="h3">{title}</Heading>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
    </fieldset>
  )
}

const ProductComplianceWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const key = ["patrix-compliance", product.id]
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => sdk.client.fetch<{ compliance: Compliance | null; report: Report }>(`/admin/patrix/products/${product.id}/compliance`),
  })
  const { data: brands } = useQuery({
    queryKey: ["patrix-brands"],
    queryFn: () => sdk.client.fetch<{ brands: Brand[] }>("/admin/patrix/brands"),
  })
  const [form, setForm] = useState<Form>(() => toForm(null))
  useEffect(() => {
    if (data) {
      setForm(toForm(data.compliance))
    }
  }, [data])

  const save = useMutation({
    mutationFn: (body: ReturnType<typeof toPayload>) =>
      sdk.client.fetch<{ compliance: Compliance; report: Report }>(`/admin/patrix/products/${product.id}/compliance`, {
        method: "POST",
        body,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(key, res)
      toast.success(res.report.complete ? "Zapisano. Dane są kompletne." : "Zapisano. Uzupełnij brakujące dane przed publikacją.")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const text = (k: keyof Form, label: string, hint?: string, multiline = false) => {
    const id = `pcmp-${String(k)}`
    const value = form[k] as string
    return (
      <Field id={id} label={label} hint={hint}>
        {multiline ? (
          <Textarea id={id} value={value} onChange={(e) => set(k, e.target.value as never)} />
        ) : (
          <Input id={id} size="small" value={value} onChange={(e) => set(k, e.target.value as never)} />
        )}
      </Field>
    )
  }
  const check = (k: keyof Form, label: string) => (
    <div className="flex items-center gap-x-2">
      <Checkbox id={`pcmp-${String(k)}`} checked={form[k] as boolean} onCheckedChange={(v) => set(k, (v === true) as never)} />
      <Label htmlFor={`pcmp-${String(k)}`} size="small">
        {label}
      </Label>
    </div>
  )

  if (isLoading) {
    return (
      <Container className="px-6 py-4">
        <Text>Wczytywanie danych produktu…</Text>
      </Container>
    )
  }
  if (isError || !data) {
    return (
      <Container className="px-6 py-4">
        <Text className="text-ui-fg-error">Nie udało się wczytać danych PATRIX dla produktu.</Text>
      </Container>
    )
  }

  const report = data.report
  const status = data.compliance?.data_status ?? "draft"
  const kind = form.product_kind

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Dane produktu PATRIX</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Wpisuj wyłącznie dane z polskiej etykiety, karty charakterystyki lub od producenta. Bez kompletu danych produktu nie da się opublikować.
          </Text>
        </div>
        <Badge color={report.complete ? "green" : status === "draft" ? "grey" : "orange"}>
          {report.complete ? "Gotowy do publikacji" : STATUS_LABEL[status] ?? status}
        </Badge>
      </div>

      {(report.missing.length > 0 || report.warnings.length > 0) && (
        <div className="flex flex-col gap-y-2 px-6 py-4" aria-live="polite">
          {report.missing.length > 0 && (
            <>
              <Text weight="plus">Brakuje przed publikacją:</Text>
              <ul className="list-disc pl-5">
                {report.missing.map((m, i) => (
                  <li key={`${m.field}-${i}`}>
                    <Text size="small">{m.message}</Text>
                  </li>
                ))}
              </ul>
            </>
          )}
          {report.warnings.length > 0 && (
            <>
              <Text weight="plus">Zalecenia:</Text>
              <ul className="list-disc pl-5">
                {report.warnings.map((m, i) => (
                  <li key={`${m.field}-${i}`}>
                    <Text size="small" className="text-ui-fg-subtle">
                      {m.message}
                    </Text>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(toPayload(form))
        }}
        className="divide-y"
      >
        <Section title="Rodzaj i marka">
          <Field id="pcmp-kind" label="Rodzaj produktu" hint="Określa, jakie dane są obowiązkowe.">
            <Select value={kind} onValueChange={(v) => set("product_kind", v)}>
              <Select.Trigger id="pcmp-kind">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {KINDS.map((k) => (
                  <Select.Item key={k.value} value={k.value}>
                    {k.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
          <Field id="pcmp-brand" label="Marka">
            <Select value={form.brand_id || "none"} onValueChange={(v) => set("brand_id", v === "none" ? "" : v)}>
              <Select.Trigger id="pcmp-brand">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">Brak</Select.Item>
                {(brands?.brands ?? []).map((b) => (
                  <Select.Item key={b.id} value={b.id}>
                    {b.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
          {text("name_original", "Nazwa oryginalna (niemiecka)")}
          {text("country_of_origin", "Kraj pochodzenia", "Tylko gdy wynika z etykiety lub dokumentów.")}
        </Section>

        <Section title="Producent i podmiot odpowiedzialny (GPSR)">
          {text("manufacturer_name", "Producent: nazwa")}
          {text("manufacturer_contact", "Producent: e-mail lub strona kontaktowa")}
          {text("manufacturer_address", "Producent: adres pocztowy", undefined, true)}
          <div className="flex flex-col justify-center">{check("manufacturer_in_eu", "Producent ma siedzibę w UE")}</div>
          {text("eu_responsible_name", "Osoba odpowiedzialna w UE: nazwa", "Wymagana dla kosmetyków i producentów spoza UE.")}
          {text("eu_responsible_address", "Osoba odpowiedzialna w UE: adres", undefined, true)}
        </Section>

        <Section title="Ilość i etykieta">
          <Field id="pcmp-net_quantity" label="Ilość netto" hint="Podstawa ceny jednostkowej.">
            <Input
              id="pcmp-net_quantity"
              size="small"
              inputMode="decimal"
              value={form.net_quantity}
              onChange={(e) => set("net_quantity", e.target.value)}
            />
          </Field>
          <Field id="pcmp-unit" label="Jednostka">
            <Select value={form.net_quantity_unit || "none"} onValueChange={(v) => set("net_quantity_unit", v === "none" ? "" : v)}>
              <Select.Trigger id="pcmp-unit">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">—</Select.Item>
                {UNITS.map((u) => (
                  <Select.Item key={u} value={u}>
                    {u}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
          {text("ingredients", kind === "cosmetic" ? "Składniki (INCI)" : "Skład", undefined, true)}
          {text("warnings", "Ostrzeżenia (po polsku)", undefined, true)}
          {text("usage_instructions", "Sposób użycia", undefined, true)}
          {text("storage_conditions", "Warunki przechowywania", undefined, true)}
        </Section>

        {kind === "food" && (
          <Section title="Żywność (rozporządzenie 1169/2011)">
            {text("allergens", "Alergeny", "Jeden na linię, tak jak na etykiecie.", true)}
            <div className="flex flex-col justify-center">{check("allergens_confirmed", "Alergeny sprawdzone z etykietą (także gdy brak)")}</div>
            {NUTRITION.map(([k, label]) => (
              <Field key={k} id={`pcmp-n-${k}`} label={`${label} w 100 g/ml`}>
                <Input
                  id={`pcmp-n-${k}`}
                  size="small"
                  inputMode="decimal"
                  value={form.nutrition[k] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nutrition: { ...f.nutrition, [k]: e.target.value } }))}
                />
              </Field>
            ))}
          </Section>
        )}

        {kind === "household_chemical" && (
          <Section title="Oznakowanie CLP">
            <Field id="pcmp-signal" label="Hasło ostrzegawcze">
              <Select value={form.clp_signal_word || "none"} onValueChange={(v) => set("clp_signal_word", v === "none" ? "" : v)}>
                <Select.Trigger id="pcmp-signal">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="none">—</Select.Item>
                  <Select.Item value="not_classified">Produkt niesklasyfikowany</Select.Item>
                  <Select.Item value="warning">Uwaga</Select.Item>
                  <Select.Item value="danger">Niebezpieczeństwo</Select.Item>
                </Select.Content>
              </Select>
            </Field>
            {text("ufi_code", "Kod UFI", "Format XXXX-XXXX-XXXX-XXXX")}
            {text("clp_hazard_statements", "Zwroty H", "Jeden na linię, np. H319 Działa drażniąco na oczy.", true)}
            {text("clp_precautionary_statements", "Zwroty P", "Jeden na linię.", true)}
            <fieldset className="flex flex-col gap-y-2 md:col-span-2">
              <legend className="mb-1">
                <Text size="small" weight="plus">
                  Piktogramy
                </Text>
              </legend>
              <div className="flex flex-wrap gap-4">
                {PICTOGRAMS.map((p) => (
                  <div key={p} className="flex items-center gap-x-2">
                    <Checkbox
                      id={`pcmp-${p}`}
                      checked={form.clp_pictograms.includes(p)}
                      onCheckedChange={(v) =>
                        set("clp_pictograms", v === true ? [...form.clp_pictograms, p] : form.clp_pictograms.filter((x) => x !== p))
                      }
                    />
                    <Label htmlFor={`pcmp-${p}`} size="small">
                      {p}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          </Section>
        )}

        {kind === "cosmetic" && (
          <Section title="Kosmetyk (rozporządzenie 1223/2009)">
            {text("cosmetic_function", "Funkcja kosmetyku")}
            {text("cosmetic_pao_months", "Okres po otwarciu (miesiące)")}
          </Section>
        )}

        <Section title="Weryfikacja">
          <div className="md:col-span-2">{check("polish_label_verified", "Potwierdzam zgodność danych z polską etykietą lub dokumentacją producenta")}</div>
          {text("internal_notes", "Notatki wewnętrzne (niewidoczne dla klientów)", undefined, true)}
          {data.compliance?.reviewed_at && (
            <Text size="small" className="text-ui-fg-subtle">
              Ostatnie potwierdzenie: {new Date(data.compliance.reviewed_at).toLocaleString("pl-PL")}
            </Text>
          )}
        </Section>

        <div className="flex justify-end px-6 py-4">
          <Button type="submit" size="small" isLoading={save.isPending}>
            Zapisz dane produktu
          </Button>
        </div>
      </form>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product.details.after" })

export default ProductComplianceWidget
