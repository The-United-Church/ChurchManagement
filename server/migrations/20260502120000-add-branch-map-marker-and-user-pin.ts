import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBranchMapMarkerAndUserPin20260502120000 implements MigrationInterface {
  name = "AddBranchMapMarkerAndUserPin20260502120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "branches"
      ADD COLUMN IF NOT EXISTS "map_marker" varchar NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "map_pin_lat" double precision NULL,
      ADD COLUMN IF NOT EXISTS "map_pin_lng" double precision NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "map_pin_lng",
      DROP COLUMN IF EXISTS "map_pin_lat"
    `);
    await queryRunner.query(`
      ALTER TABLE "branches"
      DROP COLUMN IF EXISTS "map_marker"
    `);
  }
}
