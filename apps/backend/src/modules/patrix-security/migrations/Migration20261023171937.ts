import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261023171937 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "staff_role_assignment" drop constraint if exists "staff_role_assignment_user_id_role_id_unique";`);
    this.addSql(`alter table if exists "staff_role" drop constraint if exists "staff_role_handle_unique";`);
    this.addSql(`create table if not exists "audit_log" ("id" text not null, "actor_type" text not null, "actor_id" text null, "action" text not null, "method" text null, "path" text null, "status_code" integer null, "ip" text null, "user_agent" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "audit_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_deleted_at" ON "audit_log" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_actor_id" ON "audit_log" ("actor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_action" ON "audit_log" ("action") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_created_at" ON "audit_log" ("created_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "staff_role" ("id" text not null, "handle" text not null, "name" text not null, "description" text null, "permissions" jsonb not null, "is_system" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "staff_role_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_staff_role_deleted_at" ON "staff_role" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_staff_role_handle_unique" ON "staff_role" ("handle") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "staff_role_assignment" ("id" text not null, "user_id" text not null, "role_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "staff_role_assignment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_staff_role_assignment_deleted_at" ON "staff_role_assignment" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_staff_role_assignment_user_id_role_id_unique" ON "staff_role_assignment" ("user_id", "role_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_staff_role_assignment_user_id" ON "staff_role_assignment" ("user_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_log" cascade;`);

    this.addSql(`drop table if exists "staff_role" cascade;`);

    this.addSql(`drop table if exists "staff_role_assignment" cascade;`);
  }

}
