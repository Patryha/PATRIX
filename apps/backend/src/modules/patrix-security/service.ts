import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { isValidPermission, SYSTEM_ROLES } from "../../lib/permissions"
import AuditLog from "./models/audit-log"
import StaffRole from "./models/staff-role"
import StaffRoleAssignment from "./models/staff-role-assignment"

export type AuditEntry = {
  actor_type: "user" | "customer" | "system" | "anonymous"
  actor_id?: string | null
  action: string
  method?: string | null
  path?: string | null
  status_code?: number | null
  ip?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
}

const PERMISSION_CACHE_TTL_MS = 30_000

export function permissionsOf(role: { permissions?: unknown }): string[] {
  const value = role.permissions as { list?: unknown } | null
  return Array.isArray(value?.list) ? value!.list.filter((p): p is string => typeof p === "string") : []
}

class PatrixSecurityService extends MedusaService({ AuditLog, StaffRole, StaffRoleAssignment }) {
  private readonly permissionCache = new Map<string, { permissions: string[]; expiresAt: number }>()

  async recordAudit(entry: AuditEntry): Promise<void> {
    await this.createAuditLogs({ ...entry, actor_id: entry.actor_id ?? null, metadata: entry.metadata ?? null })
  }

  /** Tworzy lub aktualizuje role systemowe zdefiniowane w kodzie (idempotentnie). */
  async syncSystemRoles(): Promise<void> {
    const existing = await this.listStaffRoles({ handle: SYSTEM_ROLES.map((r) => r.handle) })
    for (const role of SYSTEM_ROLES) {
      const data = {
        name: role.name,
        description: role.description,
        permissions: { list: role.permissions },
        is_system: true,
      }
      const current = existing.find((r) => r.handle === role.handle)
      if (current) {
        await this.updateStaffRoles({ id: current.id, ...data })
      } else {
        await this.createStaffRoles({ handle: role.handle, ...data })
      }
    }
    this.permissionCache.clear()
  }

  async createCustomRole(input: { handle: string; name: string; description?: string | null; permissions: string[] }) {
    const invalid = input.permissions.filter((p) => !isValidPermission(p))
    if (invalid.length) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Nieznane uprawnienia: ${invalid.join(", ")}`)
    }
    return await this.createStaffRoles({
      handle: input.handle,
      name: input.name,
      description: input.description ?? null,
      permissions: { list: input.permissions },
      is_system: false,
    })
  }

  /** Zastępuje role użytkownika podanym zestawem (po uchwytach ról). */
  async setUserRoles(userId: string, roleHandles: string[]) {
    const roles = roleHandles.length ? await this.listStaffRoles({ handle: roleHandles }) : []
    const missing = roleHandles.filter((h) => !roles.some((r) => r.handle === h))
    if (missing.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Nie znaleziono ról: ${missing.join(", ")}`)
    }
    const current = await this.listStaffRoleAssignments({ user_id: userId })
    const toRemove = current.filter((a) => !roles.some((r) => r.id === a.role_id))
    const toAdd = roles.filter((r) => !current.some((a) => a.role_id === r.id))
    if (toRemove.length) {
      await this.deleteStaffRoleAssignments(toRemove.map((a) => a.id))
    }
    if (toAdd.length) {
      await this.createStaffRoleAssignments(toAdd.map((r) => ({ user_id: userId, role_id: r.id })))
    }
    this.permissionCache.delete(userId)
    return roles
  }

  async getUserRoles(userId: string) {
    const assignments = await this.listStaffRoleAssignments({ user_id: userId })
    if (!assignments.length) {
      return []
    }
    return await this.listStaffRoles({ id: assignments.map((a) => a.role_id) })
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const cached = this.permissionCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions
    }
    const roles = await this.getUserRoles(userId)
    const permissions = [...new Set(roles.flatMap(permissionsOf))]
    this.permissionCache.set(userId, { permissions, expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS })
    return permissions
  }

  async countOwners(): Promise<number> {
    const [owner] = await this.listStaffRoles({ handle: "owner" })
    if (!owner) {
      return 0
    }
    return (await this.listStaffRoleAssignments({ role_id: owner.id })).length
  }
}

export default PatrixSecurityService
