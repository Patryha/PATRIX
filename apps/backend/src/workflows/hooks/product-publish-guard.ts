import { createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { assertPublishable } from "../../lib/catalog/publish-guard"

createProductsWorkflow.hooks.productsCreated(async ({ products }, { container }) => {
  await assertPublishable(container, products)
})

updateProductsWorkflow.hooks.productsUpdated(async ({ products }, { container }) => {
  await assertPublishable(container, products)
})
