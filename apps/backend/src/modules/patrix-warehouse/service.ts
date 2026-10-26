import { MedusaService } from "@medusajs/framework/utils"
import StockBatch from "./models/stock-batch"
import StockCount from "./models/stock-count"
import StockCountLine from "./models/stock-count-line"
import StockMovement from "./models/stock-movement"

class PatrixWarehouseService extends MedusaService({ StockBatch, StockMovement, StockCount, StockCountLine }) {}

export default PatrixWarehouseService
