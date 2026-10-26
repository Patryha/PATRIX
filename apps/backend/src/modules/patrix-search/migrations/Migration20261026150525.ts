import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026150525 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "search_term_stat" drop constraint if exists "search_term_stat_term_unique";`);
    this.addSql(`create table if not exists "search_synonym" ("id" text not null, "terms" jsonb not null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "search_synonym_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_search_synonym_deleted_at" ON "search_synonym" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "search_term_stat" ("id" text not null, "term" text not null, "searches" integer not null default 0, "zero_results" integer not null default 0, "last_results" integer not null default 0, "last_searched_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "search_term_stat_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_search_term_stat_deleted_at" ON "search_term_stat" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_search_term_stat_term_unique" ON "search_term_stat" ("term") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "search_synonym" cascade;`);

    this.addSql(`drop table if exists "search_term_stat" cascade;`);
  }

}
