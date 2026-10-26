import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { receiveWebhook } from "../../../../lib/integrations"

/** Webhook operatora (płatności, przesyłki): podpis sprawdza adapter, zdarzenie zapisujemy raz. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const raw = (req as MedusaRequest & { rawBody?: Buffer }).rawBody
  const rawBody = Buffer.isBuffer(raw) ? raw : Buffer.from(typeof raw === "string" ? raw : JSON.stringify(req.body ?? {}))
  const result = await receiveWebhook(req.scope, req.params.adapter, rawBody, req.headers)
  res.status(result.status).json(result.body)
}
