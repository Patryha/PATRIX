"use server"

import { z } from "zod"
import { listProductsByHandles, type ProductSummary } from "../data/products"

const Handles = z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).max(12)

/** Karty produktów dla listy uchwytów z pamięci przeglądarki (ostatnio oglądane). */
export async function getRecentProducts(handles: unknown): Promise<ProductSummary[]> {
  const parsed = Handles.safeParse(handles)
  if (!parsed.success || !parsed.data.length) {
    return []
  }
  return listProductsByHandles(parsed.data).catch(() => [])
}
