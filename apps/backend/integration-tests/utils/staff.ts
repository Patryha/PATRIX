import { createHmac } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"

export const PASSWORD = "Test-Passw0rd!"

/** Tworzy pracownika (konto e-mail/hasło) i opcjonalnie nadaje mu role PATRIX. */
export async function createStaff(container: MedusaContainer, email: string, roles: string[] = []) {
  const auth = container.resolve(Modules.AUTH)
  const { authIdentity } = await auth.register("emailpass", { body: { email, password: PASSWORD } } as never)
  const { result: user } = await createUserAccountWorkflow(container).run({
    input: { authIdentityId: authIdentity!.id, userData: { email } },
  })
  const security = container.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  if (roles.length) {
    await security.setUserRoles(user.id, roles)
  }
  return user
}

export async function login(api: any, email: string, password = PASSWORD) {
  const { data } = await api.post("/auth/user/emailpass", { email, password })
  return data as { token: string; mfa_required?: boolean; mfa_challenge?: { id: string } }
}

export const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } })

/** RFC 6238 TOTP (SHA-1, 6 cyfr, 30 s) do testów MFA. */
export function totp(base32Secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const char of base32Secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0")
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)))
  const hmac = createHmac("sha1", key).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, "0")
}
