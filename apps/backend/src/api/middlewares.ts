import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import {
  CreateBrandSchema,
  CreateRoleSchema,
  SaveDraftSchema,
  SetUserRolesSchema,
  SetVariantCostSchema,
  UpdateBrandSchema,
  UpsertComplianceSchema,
} from "./admin/patrix/validators"
import { authorizeAdminRequest } from "./middlewares/authorize"
import { auditAdminLogin, auditAdminMutations } from "./middlewares/audit"
import { enforceAdminMfaEnrollment } from "./middlewares/mfa"
import { rateLimit } from "./middlewares/rate-limit"
import { errorHandlerWithSecurityHeaders, securityHeaders } from "./middlewares/security-headers"

export default defineMiddlewares({
  errorHandler: errorHandlerWithSecurityHeaders,
  routes: [
    { matcher: "/*", middlewares: [securityHeaders] },

    // Logowanie i rejestracja: limit prób z jednego IP.
    {
      matcher: "/auth/*",
      methods: ["POST"],
      middlewares: [rateLimit({ name: "auth", limit: 20, windowSeconds: 300 })],
    },
    {
      matcher: "/auth/user/emailpass",
      methods: ["POST"],
      middlewares: [auditAdminLogin],
    },
    {
      matcher: "/store/customers*",
      methods: ["POST"],
      middlewares: [rateLimit({ name: "store-customers", limit: 30, windowSeconds: 300 })],
    },

    { matcher: "/admin/*", middlewares: [enforceAdminMfaEnrollment, authorizeAdminRequest, auditAdminMutations] },
    { matcher: "/admin/patrix/roles", methods: ["POST"], middlewares: [validateAndTransformBody(CreateRoleSchema)] },
    {
      matcher: "/admin/patrix/users/:id/roles",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(SetUserRolesSchema)],
    },
    { matcher: "/admin/patrix/brands", methods: ["POST"], middlewares: [validateAndTransformBody(CreateBrandSchema)] },
    { matcher: "/admin/patrix/brands/:id", methods: ["POST"], middlewares: [validateAndTransformBody(UpdateBrandSchema)] },
    {
      matcher: "/admin/patrix/products/:id/compliance",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(UpsertComplianceSchema)],
    },
    {
      matcher: "/admin/patrix/cms/pages/:key/draft",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(SaveDraftSchema)],
    },
    {
      matcher: "/admin/patrix/variants/:id/cost",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(SetVariantCostSchema)],
    },
  ],
})
