import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026122059 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "stock_count_line" drop constraint if exists "stock_count_line_count_id_inventory_item_id_unique";`);
    this.addSql(`create table if not exists "stock_count" ("id" text not null, "location_id" text not null, "status" text check ("status" in ('open', 'closed', 'canceled')) not null default 'open', "note" text null, "opened_by" text null, "closed_by" text null, "closed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_count_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_count_deleted_at" ON "stock_count" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_count_location_id_status" ON "stock_count" ("location_id", "status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "stock_count_line" ("id" text not null, "count_id" text not null, "inventory_item_id" text not null, "expected" integer not null, "counted" integer null, "applied" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_count_line_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_count_line_deleted_at" ON "stock_count_line" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_count_line_count_id" ON "stock_count_line" ("count_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_count_line_count_id_inventory_item_id_unique" ON "stock_count_line" ("count_id", "inventory_item_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_count" cascade;`);

    this.addSql(`drop table if exists "stock_count_line" cascade;`);
  }

}
