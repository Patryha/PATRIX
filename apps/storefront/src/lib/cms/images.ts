const hosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "localhost")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)

/**
 * Obrazy z CMS: optymalizujemy tylko z hostów skonfigurowanych w next.config (NEXT_PUBLIC_IMAGE_HOSTS).
 * Obraz z innego hosta (np. wklejony adres https) wyświetlamy bez optymalizacji zamiast błędu strony.
 */
export function canOptimize(url: string) {
  if (url.startsWith("/")) {
    return true
  }
  try {
    return hosts.includes(new URL(url).hostname)
  } catch {
    return false
  }
}
