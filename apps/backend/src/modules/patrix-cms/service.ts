import { createHash, randomBytes } from "node:crypto"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import BlogPost from "./models/blog-post"
import PageVersion from "./models/page-version"
import { LayoutContentSchema } from "./layout"
import { PageContentSchema, type PageContent, type PageKey } from "./sections"

/** Schemat treści dla każdej strony CMS. */
const SCHEMAS = { home: PageContentSchema, layout: LayoutContentSchema } as const

export const PREVIEW_TTL_MINUTES = 60

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

class PatrixCmsService extends MedusaService({ PageVersion, BlogPost }) {
  async getVersion(pageKey: PageKey, status: "draft" | "published") {
    const [row] = await this.listPageVersions({ page_key: pageKey, status }, { take: 1 })
    return row ?? null
  }

  async listHistory(pageKey: PageKey, take = 30) {
    return this.listPageVersions(
      { page_key: pageKey },
      { order: { version: "DESC" }, take, select: ["id", "version", "status", "note", "created_by", "updated_by", "published_by", "published_at", "created_at", "updated_at"] }
    )
  }

  private async nextVersion(pageKey: PageKey) {
    const [last] = await this.listPageVersions({ page_key: pageKey }, { order: { version: "DESC" }, take: 1, withDeleted: true })
    return (last?.version ?? 0) + 1
  }

  /** Zapisuje szkic (tworzy go, jeśli nie istnieje). Treść jest walidowana schematem danej strony. */
  async saveDraft(pageKey: PageKey, content: unknown, actor: string | null, note?: string | null) {
    const parsed = SCHEMAS[pageKey].safeParse(content)
    if (!parsed.success) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "))
    }
    const draft = await this.getVersion(pageKey, "draft")
    if (draft) {
      return this.updatePageVersions({ id: draft.id, content: parsed.data, updated_by: actor, note: note ?? draft.note })
    }
    return this.createPageVersions({
      page_key: pageKey,
      version: await this.nextVersion(pageKey),
      status: "draft",
      content: parsed.data,
      created_by: actor,
      updated_by: actor,
      note: note ?? null,
    })
  }

  /** Publikuje szkic: dotychczasowa wersja opublikowana trafia do archiwum. */
  async publishDraft(pageKey: PageKey, actor: string | null) {
    const draft = await this.getVersion(pageKey, "draft")
    if (!draft) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Brak szkicu do opublikowania")
    }
    SCHEMAS[pageKey].parse(draft.content)
    const current = await this.getVersion(pageKey, "published")
    if (current) {
      await this.updatePageVersions({ id: current.id, status: "archived" })
    }
    return this.updatePageVersions({
      id: draft.id,
      status: "published",
      published_by: actor,
      published_at: new Date(),
      preview_token_hash: null,
      preview_expires_at: null,
    })
  }

  /** Kopiuje treść wybranej wersji do szkicu (nadpisuje bieżący szkic). */
  async restoreToDraft(pageKey: PageKey, versionId: string, actor: string | null) {
    const [source] = await this.listPageVersions({ id: versionId, page_key: pageKey }, { take: 1 })
    if (!source) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Nie znaleziono wersji")
    }
    return this.saveDraft(pageKey, source.content, actor, `Przywrócono wersję ${source.version}`)
  }

  async discardDraft(pageKey: PageKey) {
    const draft = await this.getVersion(pageKey, "draft")
    if (draft) {
      await this.deletePageVersions(draft.id)
    }
  }

  /** Jednorazowy token podglądu szkicu. W bazie zostaje tylko jego skrót. */
  async createPreviewToken(pageKey: PageKey) {
    const draft = await this.getVersion(pageKey, "draft")
    if (!draft) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Brak szkicu do podglądu")
    }
    const token = randomBytes(32).toString("base64url")
    const expires = new Date(Date.now() + PREVIEW_TTL_MINUTES * 60 * 1000)
    await this.updatePageVersions({ id: draft.id, preview_token_hash: hashToken(token), preview_expires_at: expires })
    return { token, expires_at: expires }
  }

  async getByPreviewToken(token: string) {
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
      return null
    }
    const [row] = await this.listPageVersions({ preview_token_hash: hashToken(token), status: "draft" }, { take: 1 })
    if (!row || !row.preview_expires_at || new Date(row.preview_expires_at) < new Date()) {
      return null
    }
    return row
  }
}

export default PatrixCmsService
export type { PageContent }
