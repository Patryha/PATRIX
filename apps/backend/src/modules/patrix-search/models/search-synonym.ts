import { model } from "@medusajs/framework/utils"

/** Grupa synonimów wyszukiwarki: każde z określeń znajduje produkty opisane pozostałymi (np. „proszek”, „Waschpulver”). */
const SearchSynonym = model.define("search_synonym", {
  id: model.id({ prefix: "ssyn" }).primaryKey(),
  terms: model.json(),
  note: model.text().nullable(),
})

export default SearchSynonym
