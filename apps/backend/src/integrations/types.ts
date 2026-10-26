import type { MedusaContainer } from "@medusajs/framework/types"

export type IntegrationCategory = "payment" | "shipping" | "accounting" | "marketplace" | "email"
export type IntegrationMode = "sandbox" | "production"

export type CredentialField = { key: string; label: string; secret: boolean }

export type WebhookVerification =
  | { valid: true; external_id: string; event_type: string | null; payload: unknown }
  | { valid: false; reason: string }

/**
 * Adapter integracji. Każda operacja dostaje odszyfrowane dane dostępowe tylko na czas wywołania;
 * adapter nigdy ich nie zapisuje ani nie loguje.
 */
export type IntegrationAdapter = {
  id: string
  credentialFields: CredentialField[]
  /** Prawdziwe połączenie z API operatora (np. pobranie konfiguracji konta); bez niego panel nie pokazuje testu. */
  testConnection?: (credentials: Record<string, string>, mode: IntegrationMode) => Promise<{ ok: boolean; message: string }>
  /** Sprawdzenie podpisu webhooka na surowej treści żądania. */
  verifyWebhook?: (rawBody: Buffer, headers: Record<string, string | string[] | undefined>, credentials: Record<string, string>) => WebhookVerification
  /** Obsługa zweryfikowanego zdarzenia; wyjątek = ponowienie później. Musi być idempotentna. */
  handleWebhook?: (event: { external_id: string; event_type: string | null; payload: unknown }, container: MedusaContainer) => Promise<"processed" | "ignored">
}

export type ManifestEntry = { id: string; name: string; category: IntegrationCategory }
