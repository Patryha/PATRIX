import { z } from "zod"

/** NIP: 10 cyfr, suma kontrolna z wagami 6,5,7,2,3,4,5,6,7 (myślniki i spacje są ignorowane). */
export function normalizeNip(value: string) {
  return value.replace(/[\s-]/g, "").replace(/^PL/i, "")
}

export function isValidNip(value: string) {
  const nip = normalizeNip(value)
  if (!/^\d{10}$/.test(nip)) {
    return false
  }
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const sum = weights.reduce((acc, w, i) => acc + w * Number(nip[i]), 0)
  const check = sum % 11
  return check !== 10 && check === Number(nip[9])
}

export const POSTAL_CODE = /^\d{2}-\d{3}$/

const text = (label: string, max = 120) =>
  z
    .string({ error: `Podaj: ${label}.` })
    .trim()
    .min(1, `Podaj: ${label}.`)
    .max(max, `Pole „${label}” jest za długie.`)

export const AddressSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email("Podaj prawidłowy adres e-mail.")),
    first_name: text("imię", 60),
    last_name: text("nazwisko", 80),
    phone: z
      .string()
      .trim()
      .regex(/^(\+48)?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/, "Podaj numer telefonu, np. 600 700 800."),
    address_1: text("ulica i numer", 150),
    postal_code: z.string().trim().regex(POSTAL_CODE, "Kod pocztowy w formacie 00-000."),
    city: text("miejscowość", 80),
    invoice: z.literal("on").optional(),
    company: z.string().trim().max(150).optional(),
    nip: z.string().trim().max(20).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.invoice !== "on") {
      return
    }
    if (!v.company) {
      ctx.addIssue({ code: "custom", path: ["company"], message: "Podaj nazwę firmy do faktury." })
    }
    if (!v.nip || !isValidNip(v.nip)) {
      ctx.addIssue({ code: "custom", path: ["nip"], message: "Podaj prawidłowy NIP (10 cyfr)." })
    }
  })

export type AddressInput = z.infer<typeof AddressSchema>

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    out[key] ??= issue.message
  }
  return out
}
