import type { IntegrationAdapter, ManifestEntry } from "./types"

/**
 * Integracje planowane w PATRIX (INTEGRATIONS.md). Wpis w manifeście nie oznacza działania: panel pokazuje
 * integrację jako gotową do podłączenia dopiero, gdy istnieje adapter w `ADAPTERS`.
 */
export const MANIFEST: ManifestEntry[] = [
  { id: "przelewy24", name: "Przelewy24", category: "payment" },
  { id: "payu", name: "PayU", category: "payment" },
  { id: "tpay", name: "Tpay", category: "payment" },
  { id: "stripe", name: "Stripe", category: "payment" },
  { id: "inpost", name: "InPost (Paczkomaty i kurier)", category: "shipping" },
  { id: "dpd", name: "DPD Polska", category: "shipping" },
  { id: "dhl", name: "DHL Parcel Polska", category: "shipping" },
  { id: "gls", name: "GLS Poland", category: "shipping" },
  { id: "orlen", name: "ORLEN Paczka", category: "shipping" },
  { id: "poczta-polska", name: "Poczta Polska", category: "shipping" },
  { id: "fakturownia", name: "Fakturownia", category: "accounting" },
  { id: "infakt", name: "inFakt", category: "accounting" },
  { id: "baselinker", name: "Base (BaseLinker)", category: "marketplace" },
  { id: "allegro", name: "Allegro", category: "marketplace" },
]

const ADAPTERS = new Map<string, IntegrationAdapter>()

export function registerAdapter(adapter: IntegrationAdapter) {
  ADAPTERS.set(adapter.id, adapter)
}

export function getAdapter(id: string): IntegrationAdapter | undefined {
  return ADAPTERS.get(id)
}

/** Adapter spoza manifestu (np. testowy) jest widoczny tylko, gdy został zarejestrowany. */
export function listIntegrations() {
  const known = MANIFEST.map((entry) => ({ ...entry, adapter: ADAPTERS.get(entry.id) ?? null }))
  const extra = [...ADAPTERS.values()]
    .filter((a) => !MANIFEST.some((m) => m.id === a.id))
    .map((a) => ({ id: a.id, name: a.id, category: "payment" as const, adapter: a }))
  return [...known, ...extra]
}
