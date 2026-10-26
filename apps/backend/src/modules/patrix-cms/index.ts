import { Module } from "@medusajs/framework/utils"
import PatrixCmsService from "./service"

export const PATRIX_CMS_MODULE = "patrixCms"

export default Module(PATRIX_CMS_MODULE, { service: PatrixCmsService })

export type { PatrixCmsService }
export * from "./sections"
export * from "./layout"
export { DEFAULT_HOME } from "./default-home"
export { DEFAULT_LAYOUT } from "./default-layout"
