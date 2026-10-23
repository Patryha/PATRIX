import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261023175149 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "variant_cost" drop constraint if exists "variant_cost_variant_id_unique";`);
    this.addSql(`alter table if exists "product_compliance" drop constraint if exists "product_compliance_product_id_unique";`);
    this.addSql(`alter table if exists "brand" drop constraint if exists "brand_handle_unique";`);
    this.addSql(`create table if not exists "brand" ("id" text not null, "name" text not null, "handle" text not null, "description" text null, "country_code" text null, "website" text null, "logo_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_handle_unique" ON "brand" ("handle") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "price_history_entry" ("id" text not null, "variant_id" text not null, "currency_code" text not null, "amount" numeric not null, "recorded_at" timestamptz not null, "raw_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "price_history_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_price_history_entry_deleted_at" ON "price_history_entry" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_price_history_entry_variant_id_currency_code_recorded_at" ON "price_history_entry" ("variant_id", "currency_code", "recorded_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_compliance" ("id" text not null, "product_id" text not null, "brand_id" text null, "product_kind" text check ("product_kind" in ('general', 'food', 'household_chemical', 'cosmetic')) not null default 'general', "name_original" text null, "manufacturer_name" text null, "manufacturer_address" text null, "manufacturer_contact" text null, "manufacturer_in_eu" boolean not null default true, "eu_responsible_name" text null, "eu_responsible_address" text null, "country_of_origin" text null, "net_quantity" real null, "net_quantity_unit" text check ("net_quantity_unit" in ('g', 'kg', 'ml', 'l', 'szt', 'pranie')) null, "ingredients" text null, "allergens" jsonb null, "allergens_confirmed" boolean not null default false, "nutrition" jsonb null, "storage_conditions" text null, "usage_instructions" text null, "warnings" text null, "clp_signal_word" text check ("clp_signal_word" in ('not_classified', 'warning', 'danger')) null, "clp_hazard_statements" jsonb null, "clp_precautionary_statements" jsonb null, "clp_pictograms" jsonb null, "ufi_code" text null, "cosmetic_pao_months" integer null, "cosmetic_function" text null, "polish_label_verified" boolean not null default false, "data_status" text check ("data_status" in ('draft', 'needs_review', 'verified')) not null default 'draft', "reviewed_by" text null, "reviewed_at" timestamptz null, "internal_notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_compliance_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_compliance_deleted_at" ON "product_compliance" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_compliance_product_id_unique" ON "product_compliance" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_compliance_brand_id" ON "product_compliance" ("brand_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "variant_cost" ("id" text not null, "variant_id" text not null, "purchase_price" numeric not null, "currency_code" text not null default 'pln', "supplier" text null, "raw_purchase_price" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_cost_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_cost_deleted_at" ON "variant_cost" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_cost_variant_id_unique" ON "variant_cost" ("variant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "brand" cascade;`);

    this.addSql(`drop table if exists "price_history_entry" cascade;`);

    this.addSql(`drop table if exists "product_compliance" cascade;`);

    this.addSql(`drop table if exists "variant_cost" cascade;`);
  }

}
