import { MedusaError } from "@medusajs/framework/utils"
import { normalizePath, validateRedirect } from "../../../../lib/redirects"
import type { PatrixSeoService } from "../../../../modules/patrix-seo"
import type { SaveRedirectBody } from "../validators"

/** Normalizacja i sprawdzenie przekierowania przed zapisem (400 z czytelnym komunikatem). */
export async function prepareRedirect(seo: PatrixSeoService, body: SaveRedirectBody, id?: string) {
  const from_path = normalizePath(body.from_path)
  const to_path = normalizePath(body.to_path)
  if (!from_path || !to_path) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Podaj ścieżki w sklepie zaczynające się od „/”, np. /produkt/stary-adres.")
  }
  const existing = await seo.listRedirects({}, { select: ["id", "from_path", "to_path"], take: 10_000 })
  const error = validateRedirect({ id, from_path, to_path }, existing)
  if (error) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
  }
  return { from_path, to_path, permanent: body.permanent, note: body.note ?? null }
}
