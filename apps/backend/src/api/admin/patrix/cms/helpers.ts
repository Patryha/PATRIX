import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PAGE_KEYS, PATRIX_CMS_MODULE, type PageKey, type PatrixCmsService } from "../../../../modules/patrix-cms"

export function pageKeyOf(req: AuthenticatedMedusaRequest): PageKey {
  const key = req.params.key
  if (!(PAGE_KEYS as readonly string[]).includes(key)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Nieznana strona")
  }
  return key as PageKey
}

export const cmsOf = (req: AuthenticatedMedusaRequest) => req.scope.resolve<PatrixCmsService>(PATRIX_CMS_MODULE)
export const actorOf = (req: AuthenticatedMedusaRequest) => req.auth_context?.actor_id ?? null

/** Adres sklepu do linków podglądu: PATRIX_STOREFRONT_URL albo pierwszy wpis STORE_CORS. */
export function storefrontUrl() {
  const raw = process.env.PATRIX_STOREFRONT_URL || (process.env.STORE_CORS || "http://localhost:8000").split(",")[0]
  return raw.trim().replace(/\/$/, "")
}
