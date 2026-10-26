import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { errorHandler } from "@medusajs/framework/http"

export function applySecurityHeaders(res: MedusaResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
  // API zwraca tylko JSON: nic nie ładuje, nie da się go osadzić w ramce (panel /app nie przechodzi przez te middleware).
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
  res.removeHeader("X-Powered-By")
}

/** Nagłówki bezpieczeństwa dla odpowiedzi API. */
export function securityHeaders(_req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  applySecurityHeaders(res)
  next()
}

const defaultErrorHandler = errorHandler()

/**
 * Błędy rzucane przed naszymi middleware (np. 401 z uwierzytelniania) też dostają nagłówki.
 * Treść błędu formatuje domyślny handler Medusy, który nie ujawnia stosu wywołań.
 */
export function errorHandlerWithSecurityHeaders(
  err: unknown,
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (!res.headersSent) {
    applySecurityHeaders(res)
  }
  return defaultErrorHandler(err as never, req, res, next)
}
