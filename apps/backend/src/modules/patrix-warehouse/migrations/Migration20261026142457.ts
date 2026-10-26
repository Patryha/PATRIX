import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026142457 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "stock_movement" drop constraint if exists "stock_movement_type_check";`);

    this.addSql(`alter table if exists "stock_movement" add constraint "stock_movement_type_check" check("type" in ('receipt', 'issue', 'adjustment', 'count', 'sale', 'transfer', 'return'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "stock_movement" drop constraint if exists "stock_movement_type_check";`);

    this.addSql(`alter table if exists "stock_movement" add constraint "stock_movement_type_check" check("type" in ('receipt', 'issue', 'adjustment', 'count', 'sale', 'transfer'));`);
  }

}
