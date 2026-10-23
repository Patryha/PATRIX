import { Module } from "@medusajs/framework/utils"
import PatrixCatalogService from "./service"

export const PATRIX_CATALOG_MODULE = "patrixCatalog"

export default Module(PATRIX_CATALOG_MODULE, { service: PatrixCatalogService })

export type { PatrixCatalogService }
export type { PricePoint } from "./service"
