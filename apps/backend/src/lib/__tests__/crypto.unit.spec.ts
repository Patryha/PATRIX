import { randomBytes } from "node:crypto"
import { decryptSecret, encryptSecret, generateRecoveryCodes, loadEncryptionKey, safeEqual } from "../crypto"

const key = randomBytes(32)

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret and never stores it in plaintext", () => {
    const payload = encryptSecret("sk_live_example", key)
    expect(payload.startsWith("v1:")).toBe(true)
    expect(payload).not.toContain("sk_live_example")
    expect(decryptSecret(payload, key)).toBe("sk_live_example")
  })
  it("uses a fresh IV for every encryption", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key))
  })
  it("detects tampering", () => {
    const [v, iv, tag, data] = encryptSecret("secret", key).split(":")
    const flipped = Buffer.from(data, "base64url")
    flipped[0] ^= 1
    expect(() => decryptSecret([v, iv, tag, flipped.toString("base64url")].join(":"), key)).toThrow()
  })
  it("fails with a different key", () => {
    expect(() => decryptSecret(encryptSecret("secret", key), randomBytes(32))).toThrow()
  })
})

describe("loadEncryptionKey", () => {
  it("requires a 32-byte base64 key", () => {
    expect(() => loadEncryptionKey("")).toThrow()
    expect(() => loadEncryptionKey(Buffer.alloc(16).toString("base64"))).toThrow()
    expect(loadEncryptionKey(Buffer.alloc(32).toString("base64")).length).toBe(32)
  })
})

describe("helpers", () => {
  it("compares in constant time", () => {
    expect(safeEqual("abc", "abc")).toBe(true)
    expect(safeEqual("abc", "abd")).toBe(false)
    expect(safeEqual("abc", "abcd")).toBe(false)
  })
  it("generates unique recovery codes", () => {
    const codes = generateRecoveryCodes(10)
    expect(new Set(codes).size).toBe(10)
    expect(codes.every((c) => /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(c))).toBe(true)
  })
})
