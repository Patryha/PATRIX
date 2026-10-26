import { CmsSections } from "@/components/cms/sections"
import { visibleSections } from "@/lib/cms/types"
import { getHomePage } from "@/lib/data/cms"

/** Strona główna z sekcji zarządzanych w panelu (Treści → Strona główna). */
export default async function HomePage() {
  const content = await getHomePage()
  return <CmsSections sections={visibleSections(content)} />
}
