import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSessionAndWebsiteVisits20260502000000 implements MigrationInterface {
  name = "AddUserSessionAndWebsiteVisits20260502000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "current_session_started_at" timestamp NULL,
      ADD COLUMN IF NOT EXISTS "total_time_spent_seconds" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "website_visits" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "domain" varchar(255) NOT NULL,
        "path" varchar(500) NOT NULL DEFAULT '/',
        "page_type" varchar(40) NOT NULL,
        "visitor_id" varchar(80) NULL,
        "ip_address" varchar(120) NULL,
        "user_agent" text NULL,
        "referrer" text NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_website_visits_domain" ON "website_visits" ("domain")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_website_visits_page_type" ON "website_visits" ("page_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_website_visits_created_at" ON "website_visits" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_website_visits_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_website_visits_page_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_website_visits_domain"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "website_visits"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "total_time_spent_seconds",
      DROP COLUMN IF EXISTS "current_session_started_at"
    `);
  }
}
