import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026121456 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "stock_batch" ("id" text not null, "inventory_item_id" text not null, "location_id" text not null, "lot_number" text null, "expiry_date" timestamptz null, "quantity" integer not null, "received_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_batch_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_batch_deleted_at" ON "stock_batch" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_batch_inventory_item_id_location_id" ON "stock_batch" ("inventory_item_id", "location_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_batch_expiry_date" ON "stock_batch" ("expiry_date") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "stock_movement" ("id" text not null, "inventory_item_id" text not null, "location_id" text not null, "type" text check ("type" in ('receipt', 'issue', 'adjustment', 'count', 'sale')) not null, "quantity" integer not null, "batch_id" text null, "reason" text null, "document_ref" text null, "actor_id" text null, "source_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_movement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_movement_deleted_at" ON "stock_movement" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_movement_inventory_item_id_location_id" ON "stock_movement" ("inventory_item_id", "location_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_movement_created_at" ON "stock_movement" ("created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_movement_source_id" ON "stock_movement" ("source_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_batch" cascade;`);

    this.addSql(`drop table if exists "stock_movement" cascade;`);
  }

}
