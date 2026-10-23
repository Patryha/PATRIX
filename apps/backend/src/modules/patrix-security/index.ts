import { Module } from "@medusajs/framework/utils"
import PatrixSecurityService from "./service"

export const PATRIX_SECURITY_MODULE = "patrixSecurity"

export default Module(PATRIX_SECURITY_MODULE, { service: PatrixSecurityService })

export type { PatrixSecurityService }
