import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { consume, getRateLimitStore, type RateLimitStore } from "../../lib/rate-limit"
import { clientIp } from "../../lib/request-meta"

type Options = { name: string; limit: number; windowSeconds: number; store?: RateLimitStore }

export function rateLimit({ name, limit, windowSeconds, store }: Options) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    if (process.env.PATRIX_DISABLE_RATE_LIMIT === "true") {
      return next()
    }
    try {
      const result = await consume(store ?? getRateLimitStore(), `${name}:${clientIp(req)}`, limit, windowSeconds)
      res.setHeader("RateLimit-Limit", String(limit))
      res.setHeader("RateLimit-Remaining", String(result.remaining))
      if (!result.allowed) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds))
        return res.status(429).json({
          type: "too_many_requests",
          message: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
        })
      }
    } catch (error) {
      // Awaria licznika nie może blokować sklepu; zdarzenie trafia do logów.
      req.scope.resolve("logger").warn(`Rate limiter niedostępny: ${(error as Error).message}`)
    }
    next()
  }
}
