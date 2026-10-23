import { redirect } from "next/navigation"
import { adminUrl } from "@/lib/config"

/** /admin w domenie sklepu prowadzi do panelu administratora (Medusa Admin z rozszerzeniami PATRIX). */
export function GET() {
  redirect(adminUrl)
}
