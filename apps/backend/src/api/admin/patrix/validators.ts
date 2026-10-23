import { z } from "@medusajs/framework/zod"

export const CreateRoleSchema = z.object({
  handle: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/, "Uchwyt: małe litery, cyfry i _"),
  name: z.string().min(2).max(80),
  description: z.string().max(300).nullish(),
  permissions: z.array(z.string()).min(1),
})
export type CreateRoleBody = z.infer<typeof CreateRoleSchema>

export const SetUserRolesSchema = z.object({ roles: z.array(z.string()).max(10) })
export type SetUserRolesBody = z.infer<typeof SetUserRolesSchema>
