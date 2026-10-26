import { Module } from "@medusajs/framework/utils"
import PatrixWarehouseService from "./service"

export const PATRIX_WAREHOUSE_MODULE = "patrixWarehouse"

export default Module(PATRIX_WAREHOUSE_MODULE, { service: PatrixWarehouseService })

export type { PatrixWarehouseService }
export { MOVEMENT_TYPES } from "./models/stock-movement"
