/** Komunikaty błędów API w języku polskim (bez szczegółów technicznych). */
export function friendlyError(error: unknown, fallback = "Coś poszło nie tak. Spróbuj ponownie."): string {
  const message = error instanceof Error ? error.message : String(error ?? "")
  if (/inventory|stock/i.test(message)) {
    return "Brak wystarczającej liczby sztuk w magazynie."
  }
  if (/promotion|promo code|code .* not found|invalid code/i.test(message)) {
    return "Ten kod rabatowy jest nieprawidłowy lub wygasł."
  }
  if (/Invalid email or password|Unauthorized/i.test(message)) {
    return "Nieprawidłowy e-mail lub hasło."
  }
  if (/already exists/i.test(message)) {
    return "Konto z tym adresem e-mail już istnieje."
  }
  return fallback
}
