import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto"

/**
 * Szyfrowanie sekretów (MFA, klucze API integracji) algorytmem AES-256-GCM.
 * Format: "v1:<iv>:<tag>:<ciphertext>" (base64url). Klucz: PATRIX_ENCRYPTION_KEY (32 bajty w base64).
 */
const VERSION = "v1"

export function loadEncryptionKey(raw = process.env.PATRIX_ENCRYPTION_KEY): Buffer {
  if (!raw) {
    throw new Error("Brak PATRIX_ENCRYPTION_KEY: nie można szyfrować sekretów")
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("PATRIX_ENCRYPTION_KEY musi mieć 32 bajty zakodowane w base64")
  }
  return key
}

export function encryptSecret(plaintext: string, key: Buffer = loadEncryptionKey()): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv, tag, ciphertext].map((part) => (typeof part === "string" ? part : part.toString("base64url"))).join(":")
}

export function decryptSecret(payload: string, key: Buffer = loadEncryptionKey()): string {
  const [version, iv, tag, ciphertext] = payload.split(":")
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Nieprawidłowy format zaszyfrowanego sekretu")
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8")
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Kody zapasowe MFA: 10 znaków z alfabetu bez znaków mylących (0/O, 1/I). */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10)
    const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
    return `${chars.slice(0, 5)}-${chars.slice(5)}`
  })
}
