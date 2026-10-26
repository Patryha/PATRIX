/**
 * PATRIX: role i uprawnienia pracowników (własna implementacja; RBAC Medusy jest w edycji Enterprise).
 * Uprawnienie ma postać "zasób:operacja", np. "order:read". Obsługiwane symbole wieloznaczne: "*" oraz "zasób:*".
 */
export const OPERATIONS = ["read", "write", "delete"] as const
export type Operation = (typeof OPERATIONS)[number]

export const RESOURCES = {
  panel: "Dostęp do panelu (profil, ustawienia widoku)",
  product: "Produkty, kategorie, kolekcje, typy i tagi",
  inventory: "Magazyn: stany, lokalizacje, rezerwacje",
  fulfillment: "Kompletacja i wysyłka zamówień",
  order: "Zamówienia, zwroty, reklamacje, płatności",
  customer: "Klienci i grupy klientów",
  promotion: "Promocje, kampanie, cenniki",
  content: "Treści: strona główna, CMS, blog",
  finance: "Ceny zakupu, marże, raporty finansowe",
  settings: "Ustawienia sklepu: regiony, podatki, dostawy, kanały",
  integration: "Centrum integracji i klucze API",
  user: "Konta pracowników i zaproszenia",
  staff_role: "Role i uprawnienia pracowników",
  audit_log: "Dziennik audytu",
  file: "Przesyłanie plików i zdjęć",
} as const
export type Resource = keyof typeof RESOURCES
export type Permission = `${Resource}:${Operation}` | `${Resource}:*` | "*"

export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes("*") || granted.includes(required)) {
    return true
  }
  const [resource] = required.split(":")
  return granted.includes(`${resource}:*`)
}

export function isValidPermission(value: string): value is Permission {
  if (value === "*") {
    return true
  }
  const [resource, operation, ...rest] = value.split(":")
  return (
    rest.length === 0 &&
    resource in RESOURCES &&
    (operation === "*" || (OPERATIONS as readonly string[]).includes(operation))
  )
}

const METHOD_OPERATION: Record<string, Operation> = {
  GET: "read",
  HEAD: "read",
  POST: "write",
  PUT: "write",
  PATCH: "write",
  DELETE: "delete",
}

type Rule = { pattern: RegExp; resource: Resource; methods?: string[]; operation?: Operation }

/**
 * Mapowanie tras /admin na zasoby. Kolejność ma znaczenie: pierwsza pasująca reguła wygrywa.
 * Trasy bez reguły wymagają pełnych uprawnień ("*"), czyli domyślnie są zablokowane.
 */
const ROUTE_RULES: Rule[] = [
  { pattern: /^\/admin\/users\/me(\/|$)/, resource: "panel" },
  { pattern: /^\/admin\/(feature-flags|locales|views|notifications|search|index|layouts)(\/|$)/, resource: "panel" },
  { pattern: /^\/admin\/stores(\/|$)/, methods: ["GET"], resource: "panel" },
  { pattern: /^\/admin\/stores(\/|$)/, resource: "settings" },
  { pattern: /^\/admin\/currencies(\/|$)/, methods: ["GET"], resource: "panel" },

  { pattern: /^\/admin\/patrix\/audit-logs(\/|$)/, resource: "audit_log" },
  { pattern: /^\/admin\/patrix\/roles(\/|$)/, resource: "staff_role" },
  { pattern: /^\/admin\/patrix\/users\/[^/]+\/roles(\/|$)/, resource: "staff_role" },
  { pattern: /^\/admin\/patrix\/me(\/|$)/, resource: "panel" },
  { pattern: /^\/admin\/patrix\/(variants\/[^/]+\/cost|products\/[^/]+\/costs)(\/|$)/, resource: "finance" },
  { pattern: /^\/admin\/patrix\/(brands|products)(\/|$)/, resource: "product" },
  { pattern: /^\/admin\/patrix\/cms(\/|$)/, resource: "content" },

  { pattern: /^\/admin\/orders\/[^/]+\/fulfillments(\/|$)/, resource: "fulfillment" },
  { pattern: /^\/admin\/fulfillments(\/|$)/, resource: "fulfillment" },
  {
    pattern:
      /^\/admin\/(orders|draft-orders|order-edits|order-changes|claims|exchanges|returns|payments|payment-collections|refund-reasons|return-reasons)(\/|$)/,
    resource: "order",
  },
  {
    pattern: /^\/admin\/(products|product-variants|product-categories|collections|product-tags|product-types|product-options|property-labels)(\/|$)/,
    resource: "product",
  },
  { pattern: /^\/admin\/(inventory-items|stock-locations|reservations)(\/|$)/, resource: "inventory" },
  { pattern: /^\/admin\/(customers|customer-groups)(\/|$)/, resource: "customer" },
  { pattern: /^\/admin\/(promotions|campaigns|price-lists)(\/|$)/, resource: "promotion" },
  { pattern: /^\/admin\/uploads(\/|$)/, resource: "file" },
  { pattern: /^\/admin\/(api-keys|plugins)(\/|$)/, resource: "integration" },
  { pattern: /^\/admin\/(users|invites)(\/|$)/, resource: "user" },
  {
    pattern:
      /^\/admin\/(regions|sales-channels|shipping-options|shipping-option-types|shipping-profiles|fulfillment-sets|fulfillment-providers|tax-rates|tax-regions|tax-providers|price-preferences|translations|currencies|workflows-executions|payments\/payment-providers|search-indexes)(\/|$)/,
    resource: "settings",
  },
]

export function requiredPermission(method: string, path: string): string {
  const cleanPath = path.split("?")[0]
  const operation = METHOD_OPERATION[method.toUpperCase()] ?? "write"
  const rule = ROUTE_RULES.find((r) => r.pattern.test(cleanPath) && (!r.methods || r.methods.includes(method.toUpperCase())))
  if (!rule) {
    return "*"
  }
  // "panel" to wspólny minimalny dostęp każdego pracownika, niezależnie od metody.
  return rule.resource === "panel" ? "panel:read" : `${rule.resource}:${rule.operation ?? operation}`
}

export type SystemRole = { handle: string; name: string; description: string; permissions: Permission[] }

export const SYSTEM_ROLES: SystemRole[] = [
  {
    handle: "owner",
    name: "Właściciel",
    description: "Pełny dostęp, w tym zarządzanie rolami i pracownikami.",
    permissions: ["*"],
  },
  {
    handle: "store_manager",
    name: "Kierownik sklepu",
    description: "Prowadzenie sklepu: produkty, magazyn, zamówienia, klienci, promocje, treści.",
    permissions: [
      "panel:read",
      "product:*",
      "inventory:*",
      "fulfillment:*",
      "order:*",
      "customer:*",
      "promotion:*",
      "content:*",
      "finance:read",
      "settings:read",
      "integration:read",
      "user:read",
      "audit_log:read",
      "file:*",
    ],
  },
  {
    handle: "warehouse",
    name: "Magazynier",
    description: "Stany magazynowe, przyjęcia, kompletacja i wysyłka.",
    permissions: ["panel:read", "product:read", "inventory:*", "fulfillment:*", "order:read", "settings:read"],
  },
  {
    handle: "customer_service",
    name: "Obsługa klienta",
    description: "Zamówienia, zwroty, reklamacje i kontakt z klientem.",
    permissions: [
      "panel:read",
      "order:read",
      "order:write",
      "customer:read",
      "customer:write",
      "product:read",
      "inventory:read",
      "promotion:read",
      "fulfillment:read",
    ],
  },
  {
    handle: "marketing",
    name: "Marketing",
    description: "Opisy i SEO produktów, promocje, treści i blog.",
    permissions: ["panel:read", "product:read", "product:write", "promotion:*", "content:*", "file:*"],
  },
  {
    handle: "accounting",
    name: "Księgowość",
    description: "Wgląd w zamówienia, płatności, ceny zakupu i marże.",
    permissions: ["panel:read", "order:read", "customer:read", "product:read", "finance:read", "settings:read"],
  },
]
