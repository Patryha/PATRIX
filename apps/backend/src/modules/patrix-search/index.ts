import { Module } from "@medusajs/framework/utils"
import PatrixSearchService from "./service"

export const PATRIX_SEARCH_MODULE = "patrixSearch"

export default Module(PATRIX_SEARCH_MODULE, { service: PatrixSearchService })

export type { PatrixSearchService }
