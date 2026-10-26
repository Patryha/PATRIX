import { Module } from "@medusajs/framework/utils"
import PatrixIntegrationsService from "./service"

export const PATRIX_INTEGRATIONS_MODULE = "patrixIntegrations"

export default Module(PATRIX_INTEGRATIONS_MODULE, { service: PatrixIntegrationsService })

export type { PatrixIntegrationsService }
export { WEBHOOK_STATUSES } from "./models/integration-webhook"
