import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026091100 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "cms_page_version" drop constraint if exists "cms_page_version_page_key_version_unique";`);
    this.addSql(`create table if not exists "cms_page_version" ("id" text not null, "page_key" text not null, "version" integer not null, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "content" jsonb not null, "note" text null, "created_by" text null, "updated_by" text null, "published_by" text null, "published_at" timestamptz null, "preview_token_hash" text null, "preview_expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cms_page_version_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cms_page_version_deleted_at" ON "cms_page_version" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_page_version_page_key_version_unique" ON "cms_page_version" ("page_key", "version") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cms_page_version_page_key_status" ON "cms_page_version" ("page_key", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cms_page_version_preview_token_hash" ON "cms_page_version" ("preview_token_hash") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cms_page_version" cascade;`);
  }

}
