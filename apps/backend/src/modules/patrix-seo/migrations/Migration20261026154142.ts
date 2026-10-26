import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026154142 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seo_redirect" drop constraint if exists "seo_redirect_from_path_unique";`);
    this.addSql(`create table if not exists "seo_redirect" ("id" text not null, "from_path" text not null, "to_path" text not null, "permanent" boolean not null default true, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seo_redirect_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seo_redirect_deleted_at" ON "seo_redirect" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seo_redirect_from_path_unique" ON "seo_redirect" ("from_path") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seo_redirect" cascade;`);
  }

}
