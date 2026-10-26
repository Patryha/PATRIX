import { Module } from "@medusajs/framework/utils"
import PatrixSeoService from "./service"

export const PATRIX_SEO_MODULE = "patrixSeo"

export default Module(PATRIX_SEO_MODULE, { service: PatrixSeoService })

export type { PatrixSeoService }
