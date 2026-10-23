import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../modules/patrix-security"

/**
 * Nadaje role pracownikowi: npx medusa exec ./src/scripts/grant-role.ts <email> <rola>[,<rola>]
 * Służy do nadania roli "owner" pierwszemu kontu (później role zmienia się w panelu).
 */
export default async function grantRole({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const [email, rolesArg] = args
  if (!email || !rolesArg) {
    throw new Error("Użycie: grant-role.ts <email> <rola>[,<rola>]")
  }
  const [user] = await container.resolve(Modules.USER).listUsers({ email })
  if (!user) {
    throw new Error(`Nie znaleziono użytkownika ${email}`)
  }
  const security = container.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  await security.syncSystemRoles()
  const roles = await security.setUserRoles(user.id, rolesArg.split(",").map((r) => r.trim()))
  await security.recordAudit({
    actor_type: "system",
    action: "staff.roles_changed",
    metadata: { user_id: user.id, roles: roles.map((r) => r.handle), source: "cli" },
  })
  logger.info(`Nadano role ${roles.map((r) => r.handle).join(", ")} użytkownikowi ${email}`)
}
