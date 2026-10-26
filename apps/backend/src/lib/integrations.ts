import type { MedusaContainer } from "@medusajs/framework/types"
import { getAdapter } from "../integrations/manifest"
import type { CredentialField, IntegrationAdapter } from "../integrations/types"
import { PATRIX_INTEGRATIONS_MODULE, type PatrixIntegrationsService } from "../modules/patrix-integrations"
import { decryptSecret, encryptSecret } from "./crypto"

export const MAX_WEBHOOK_ATTEMPTS = 8
const MINUTE = 60_000

/** Ponowienie po błędzie: 1, 2, 4… minuty, najwyżej 6 godzin. */
export function retryDelayMs(attempt: number) {
  return Math.min(MINUTE * 2 ** Math.max(attempt - 1, 0), 6 * 60 * MINUTE)
}

/** Panel widzi tylko końcówkę sekretu (żeby rozpoznać, który klucz jest wpisany), nigdy całość. */
export function credentialHints(credentials: Record<string, string>, fields: CredentialField[]) {
  return Object.fromEntries(
    fields
      .filter((f) => credentials[f.key])
      .map((f) => {
        const value = credentials[f.key]
        return [f.key, f.secret ? (value.length >= 12 ? `••••${value.slice(-4)}` : "••••") : value]
      })
  )
}

export function productionAllowed() {
  return process.env.PATRIX_ALLOW_PRODUCTION_INTEGRATIONS === "true"
}

const service = (container: MedusaContainer) => container.resolve<PatrixIntegrationsService>(PATRIX_INTEGRATIONS_MODULE)

export async function loadConnection(container: MedusaContainer, adapterId: string) {
  const [connection] = await service(container).listIntegrationConnections({ adapter: adapterId }, { take: 1 })
  return connection ?? null
}

export function readCredentials(encrypted: string | null): Record<string, string> {
  return encrypted ? (JSON.parse(decryptSecret(encrypted)) as Record<string, string>) : {}
}

/**
 * Zapis połączenia. Puste pole sekretu = bez zmiany (panel nie zna obecnej wartości). Włączenie wymaga kompletu pól,
 * tryb produkcyjny dodatkowo zgody właściciela wyrażonej w konfiguracji serwera (PATRIX_ALLOW_PRODUCTION_INTEGRATIONS).
 */
export async function saveConnection(
  container: MedusaContainer,
  adapter: IntegrationAdapter,
  input: { credentials?: Record<string, string>; mode?: "sandbox" | "production"; enabled?: boolean }
) {
  const existing = await loadConnection(container, adapter.id)
  const credentials = { ...readCredentials(existing?.credentials ?? null) }
  for (const field of adapter.credentialFields) {
    const value = input.credentials?.[field.key]?.trim()
    if (value) {
      credentials[field.key] = value
    }
  }
  const mode = input.mode ?? existing?.mode ?? "sandbox"
  const enabled = input.enabled ?? existing?.enabled ?? false
  if (mode === "production" && !productionAllowed()) {
    throw new IntegrationError("Tryb produkcyjny wymaga zgody właściciela (konfiguracja serwera). Używaj trybu testowego (sandbox).")
  }
  const missing = adapter.credentialFields.filter((f) => !credentials[f.key])
  if (enabled && missing.length) {
    throw new IntegrationError(`Uzupełnij pola: ${missing.map((f) => f.label).join(", ")}.`)
  }
  const data = {
    adapter: adapter.id,
    mode,
    enabled,
    credentials: Object.keys(credentials).length ? encryptSecret(JSON.stringify(credentials)) : null,
    credential_hints: credentialHints(credentials, adapter.credentialFields),
  }
  const svc = service(container)
  return existing ? svc.updateIntegrationConnections({ id: existing.id, ...data }) : svc.createIntegrationConnections(data)
}

export class IntegrationError extends Error {}

export async function logCall(
  container: MedusaContainer,
  entry: { adapter: string; operation: string; direction: "outbound" | "inbound"; ok: boolean; duration_ms?: number; message?: string | null; reference?: string | null }
) {
  await service(container).createIntegrationLogs({
    ...entry,
    duration_ms: entry.duration_ms ?? null,
    message: entry.message?.slice(0, 500) ?? null,
    reference: entry.reference ?? null,
  })
}

/** Test połączenia wykonywany przez adapter (prawdziwe wywołanie API operatora); wynik zapisany przy połączeniu. */
export async function testConnection(container: MedusaContainer, adapter: IntegrationAdapter) {
  const connection = await loadConnection(container, adapter.id)
  if (!adapter.testConnection || !connection?.credentials) {
    throw new IntegrationError("Najpierw zapisz dane dostępowe.")
  }
  const started = Date.now()
  let result: { ok: boolean; message: string }
  try {
    result = await adapter.testConnection(readCredentials(connection.credentials), connection.mode)
  } catch (e) {
    result = { ok: false, message: (e as Error).message }
  }
  await service(container).updateIntegrationConnections({ id: connection.id, last_test_at: new Date(), last_test_ok: result.ok, last_test_message: result.message.slice(0, 500) })
  await logCall(container, { adapter: adapter.id, operation: "test_connection", direction: "outbound", ok: result.ok, duration_ms: Date.now() - started, message: result.message })
  return result
}

/**
 * Webhook od operatora: podpis sprawdzany na surowej treści, zdarzenie zapisywane raz (adapter + id zewnętrzne),
 * obsługa od razu; błąd obsługi nie odrzuca webhooka (operator nie musi ponawiać), tylko planuje ponowienie u nas.
 */
export async function receiveWebhook(container: MedusaContainer, adapterId: string, rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
  const adapter = getAdapter(adapterId)
  const connection = await loadConnection(container, adapterId)
  if (!adapter?.verifyWebhook || !connection?.enabled || !connection.credentials) {
    return { status: 404, body: { message: "Nieznana integracja." } }
  }
  const verification = adapter.verifyWebhook(rawBody, headers, readCredentials(connection.credentials))
  if (!verification.valid) {
    await logCall(container, { adapter: adapterId, operation: "webhook", direction: "inbound", ok: false, message: `Odrzucony: ${verification.reason}` })
    return { status: 401, body: { message: "Nieprawidłowy podpis." } }
  }
  const svc = service(container)
  const [duplicate] = await svc.listIntegrationWebhooks({ adapter: adapterId, external_id: verification.external_id }, { take: 1 })
  if (duplicate) {
    return { status: 200, body: { received: true, duplicate: true } }
  }
  let webhook
  try {
    webhook = await svc.createIntegrationWebhooks({
      adapter: adapterId,
      external_id: verification.external_id,
      event_type: verification.event_type,
      payload: verification.payload as Record<string, unknown>,
    })
  } catch {
    // Równoległa dostawa tego samego zdarzenia: unikalny indeks zatrzymał drugi zapis.
    return { status: 200, body: { received: true, duplicate: true } }
  }
  await logCall(container, { adapter: adapterId, operation: "webhook", direction: "inbound", ok: true, reference: verification.external_id, message: verification.event_type })
  await processWebhook(container, webhook.id)
  return { status: 200, body: { received: true } }
}

export async function processWebhook(container: MedusaContainer, webhookId: string, now = new Date()) {
  const svc = service(container)
  const webhook = await svc.retrieveIntegrationWebhook(webhookId)
  if (webhook.status === "processed" || webhook.status === "ignored") {
    return webhook.status
  }
  const adapter = getAdapter(webhook.adapter)
  const attempts = webhook.attempts + 1
  try {
    if (!adapter?.handleWebhook) {
      throw new Error("Brak obsługi zdarzeń w adapterze.")
    }
    const result = await adapter.handleWebhook({ external_id: webhook.external_id, event_type: webhook.event_type, payload: webhook.payload }, container)
    await svc.updateIntegrationWebhooks({ id: webhook.id, status: result, attempts, processed_at: now, next_attempt_at: null, last_error: null })
    return result
  } catch (e) {
    const dead = attempts >= MAX_WEBHOOK_ATTEMPTS
    await svc.updateIntegrationWebhooks({
      id: webhook.id,
      status: dead ? "dead" : "failed",
      attempts,
      last_error: (e as Error).message.slice(0, 500),
      next_attempt_at: dead ? null : new Date(now.getTime() + retryDelayMs(attempts)),
    })
    await logCall(container, { adapter: webhook.adapter, operation: "webhook_process", direction: "inbound", ok: false, reference: webhook.external_id, message: (e as Error).message })
    return dead ? "dead" : "failed"
  }
}

/** Zadanie cykliczne: ponawia zdarzenia, których termin minął. */
export async function retryDueWebhooks(container: MedusaContainer, now = new Date()) {
  const due = await service(container).listIntegrationWebhooks({ status: "failed", next_attempt_at: { $lte: now } }, { take: 50, order: { next_attempt_at: "ASC" } })
  for (const webhook of due) {
    await processWebhook(container, webhook.id, now)
  }
  return due.length
}
