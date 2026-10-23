import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Endpointy potrzebne, by użytkownik bez MFA mógł je skonfigurować w profilu panelu.
// Same trasy konfiguracji MFA (/auth/mfa/*) leżą poza /admin i nie są tu blokowane.
const ENROLLMENT_ALLOWLIST: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/admin\/users\/me(\?|\/|$)/ },
  { method: "GET", pattern: /^\/admin\/stores/ },
  { method: "GET", pattern: /^\/admin\/feature-flags/ },
  { method: "GET", pattern: /^\/admin\/locales/ },
  { method: "GET", pattern: /^\/admin\/views/ },
]

export function isEnrollmentAllowed(method: string, path: string): boolean {
  return ENROLLMENT_ALLOWLIST.some((rule) => rule.method === method && rule.pattern.test(path))
}

/**
 * ADMIN_MFA_ENFORCEMENT=required: pracownik bez aktywnego MFA (natywne MFA Medusy: TOTP + kody zapasowe)
 * ma dostęp wyłącznie do konfiguracji MFA w swoim profilu.
 */
export async function enforceAdminMfaEnrollment(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (process.env.ADMIN_MFA_ENFORCEMENT !== "required") {
    return next()
  }
  const actor = req.auth_context
  // Klucze API integracji (sk_…) nie logują się interaktywnie.
  if (!actor || actor.actor_type !== "user" || !actor.auth_identity_id || req.secret_key_context) {
    return next()
  }
  if (isEnrollmentAllowed(req.method, req.originalUrl ?? req.url)) {
    return next()
  }
  const factors = await req.scope
    .resolve(Modules.AUTH)
    .listAuthMfa({ auth_identity_id: actor.auth_identity_id, status: "enabled" } as Record<string, unknown>)
  if (factors.length > 0) {
    return next()
  }
  res.status(403).json({
    type: "not_allowed",
    code: "MFA_ENROLLMENT_REQUIRED",
    message: "Włącz uwierzytelnianie dwuskładnikowe w swoim profilu (Profil → MFA), aby kontynuować.",
  })
}
