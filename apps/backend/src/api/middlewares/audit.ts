import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../modules/patrix-security"
import { clientIp, userAgent } from "../../lib/request-meta"

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

function write(req: MedusaRequest, entry: Parameters<PatrixSecurityService["recordAudit"]>[0]) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  security.recordAudit(entry).catch((error: Error) => {
    req.scope.resolve("logger").error(`Nie udało się zapisać wpisu audytu: ${error.message}`)
  })
}

/** Zapisuje każdą zmieniającą operację w panelu administracyjnym (bez treści żądania, by nie logować danych osobowych ani sekretów). */
export function auditAdminMutations(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  if (!MUTATING.has(req.method)) {
    return next()
  }
  res.on("finish", () => {
    const auth = (req as MedusaRequest & { auth_context?: { actor_id?: string; actor_type?: string } }).auth_context
    write(req, {
      actor_type: auth?.actor_type === "user" ? "user" : "anonymous",
      actor_id: auth?.actor_id ?? null,
      action: "admin.request",
      method: req.method,
      path: (req.originalUrl ?? req.url).split("?")[0].slice(0, 500),
      status_code: res.statusCode,
      ip: clientIp(req),
      user_agent: userAgent(req),
    })
  })
  next()
}

/** Zapisuje wynik logowania do panelu (sukces/porażka) wraz z adresem e-mail próby. */
export function auditAdminLogin(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  res.on("finish", () => {
    const email = (req.body as { email?: unknown })?.email
    write(req, {
      actor_type: "anonymous",
      action: res.statusCode < 300 ? "auth.login_succeeded" : "auth.login_failed",
      method: req.method,
      path: "/auth/user/emailpass",
      status_code: res.statusCode,
      ip: clientIp(req),
      user_agent: userAgent(req),
      metadata: typeof email === "string" ? { email: email.slice(0, 254) } : null,
    })
  })
  next()
}
