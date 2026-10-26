import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026144333 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration_webhook" drop constraint if exists "integration_webhook_adapter_external_id_unique";`);
    this.addSql(`alter table if exists "integration_connection" drop constraint if exists "integration_connection_adapter_unique";`);
    this.addSql(`create table if not exists "integration_connection" ("id" text not null, "adapter" text not null, "mode" text check ("mode" in ('sandbox', 'production')) not null default 'sandbox', "enabled" boolean not null default false, "credentials" text null, "credential_hints" jsonb null, "last_test_at" timestamptz null, "last_test_ok" boolean null, "last_test_message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_connection_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_connection_deleted_at" ON "integration_connection" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_integration_connection_adapter_unique" ON "integration_connection" ("adapter") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "integration_log" ("id" text not null, "adapter" text not null, "operation" text not null, "direction" text check ("direction" in ('outbound', 'inbound')) not null, "ok" boolean not null, "duration_ms" integer null, "message" text null, "reference" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_log_deleted_at" ON "integration_log" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_log_adapter_created_at" ON "integration_log" ("adapter", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_log_created_at" ON "integration_log" ("created_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "integration_webhook" ("id" text not null, "adapter" text not null, "external_id" text not null, "event_type" text null, "payload" jsonb null, "status" text check ("status" in ('received', 'processed', 'failed', 'dead', 'ignored')) not null default 'received', "attempts" integer not null default 0, "next_attempt_at" timestamptz null, "last_error" text null, "processed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_webhook_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_webhook_deleted_at" ON "integration_webhook" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_integration_webhook_adapter_external_id_unique" ON "integration_webhook" ("adapter", "external_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_webhook_status_next_attempt_at" ON "integration_webhook" ("status", "next_attempt_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "integration_connection" cascade;`);

    this.addSql(`drop table if exists "integration_log" cascade;`);

    this.addSql(`drop table if exists "integration_webhook" cascade;`);
  }

}
