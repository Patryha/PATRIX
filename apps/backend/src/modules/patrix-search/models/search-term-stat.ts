import { model } from "@medusajs/framework/utils"

/**
 * Statystyka fraz wyszukiwania (bez danych klienta): ile razy szukano i ile razy bez wyników.
 * Podstawa do dopisywania synonimów i uzupełniania oferty.
 */
const SearchTermStat = model
  .define("search_term_stat", {
    id: model.id({ prefix: "sts" }).primaryKey(),
    term: model.text(),
    searches: model.number().default(0),
    zero_results: model.number().default(0),
    last_results: model.number().default(0),
    last_searched_at: model.dateTime(),
  })
  .indexes([{ on: ["term"], unique: true, where: "deleted_at IS NULL" }])

export default SearchTermStat
