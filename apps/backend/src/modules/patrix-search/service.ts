import { MedusaService } from "@medusajs/framework/utils"
import SearchSynonym from "./models/search-synonym"
import SearchTermStat from "./models/search-term-stat"

class PatrixSearchService extends MedusaService({ SearchSynonym, SearchTermStat }) {}

export default PatrixSearchService
