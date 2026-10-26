"use server"

import { refresh } from "next/cache"
import { updateFavorites } from "../favorites"
import { isHandle, toggleHandle } from "../favorites-list"

export type FavoriteState = { favorite: boolean; message: string } | null

export async function toggleFavorite(prev: FavoriteState, formData: FormData): Promise<FavoriteState> {
  const handle = formData.get("handle")
  if (!isHandle(handle)) {
    return { favorite: prev?.favorite ?? false, message: "Nie udało się zmienić ulubionych." }
  }
  let favorite = false
  try {
    await updateFavorites((list) => {
      const result = toggleHandle(list, handle)
      favorite = result.favorite
      return result.list
    })
  } catch {
    return { favorite: prev?.favorite ?? false, message: "Nie udało się zmienić ulubionych. Spróbuj ponownie." }
  }
  // Odświeża licznik w nagłówku i listę ulubionych.
  refresh()
  return { favorite, message: favorite ? "Dodano do ulubionych." : "Usunięto z ulubionych." }
}

export async function removeFavorite(formData: FormData) {
  const handle = formData.get("handle")
  if (isHandle(handle)) {
    await updateFavorites((list) => list.filter((h) => h !== handle))
    refresh()
  }
}
