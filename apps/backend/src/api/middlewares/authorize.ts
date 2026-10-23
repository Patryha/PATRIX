import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"
import { hasPermission, requiredPermission } from "../../lib/permissions"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../modules/patrix-security"

/**
 * Autoryzacja każdego żądania /admin według ról PATRIX (domyślnie: brak dostępu).
 * Klucze API (sk_…) tworzą wyłącznie osoby z uprawnieniem integration:write i mają pełny dostęp API.
 */
export async function authorizeAdminRequest(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actor = req.auth_context
  if (!actor || req.secret_key_context || actor.actor_type !== "user") {
    // Brak kontekstu = trasa publiczna (np. zaproszenia) lub uwierzytelnianie odrzuci żądanie wcześniej.
    return next()
  }
  const required = requiredPermission(req.method, req.originalUrl ?? req.url)
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const granted = await security.getUserPermissions(actor.actor_id)
  if (hasPermission(granted, required)) {
    return next()
  }
  res.status(403).json({
    type: "not_allowed",
    code: "PERMISSION_DENIED",
    message: granted.length
      ? `Brak uprawnienia: ${required}.`
      : "Twoje konto nie ma przypisanej roli. Poproś właściciela sklepu o nadanie uprawnień.",
  })
}
