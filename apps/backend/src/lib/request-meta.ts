import type { MedusaRequest } from "@medusajs/framework/http"

export function clientIp(req: MedusaRequest): string {
  return (req.ip || req.socket?.remoteAddress || "unknown").replace(/^::ffff:/, "")
}

export function userAgent(req: MedusaRequest): string | null {
  const ua = req.headers["user-agent"]
  return typeof ua === "string" ? ua.slice(0, 300) : null
}
