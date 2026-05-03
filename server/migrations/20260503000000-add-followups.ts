import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddFollowUps20260503000000 implements MigrationInterface {
  name = "AddFollowUps20260503000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── Enums ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_ups_type_enum" AS ENUM (
          'first_visit','absent_member','new_convert','prayer_request',
          'pastoral_care','hospital_visit','birthday','anniversary','general'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_ups_status_enum" AS ENUM ('pending','in_progress','completed','cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_ups_priority_enum" AS ENUM ('low','medium','high','urgent');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_contact_method_enum" AS ENUM (
          'phone_call','sms','whatsapp','email','in_person','other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_contact_outcome_enum" AS ENUM (
          'reached','no_answer','left_message','scheduled_callback','wrong_contact'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ─── follow_ups ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_ups" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" "follow_ups_type_enum" NOT NULL DEFAULT 'general',
        "status" "follow_ups_status_enum" NOT NULL DEFAULT 'pending',
        "priority" "follow_ups_priority_enum" NOT NULL DEFAULT 'medium',
        "person_id" uuid NULL REFERENCES "people"("id") ON DELETE CASCADE,
        "user_id" uuid NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "assigned_to" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "scheduled_date" date NULL,
        "completed_date" timestamp with time zone NULL,
        "notes" text NULL,
        "outcome_notes" text NULL,
        "related_event_id" uuid NULL,
        "is_escalated" boolean NOT NULL DEFAULT false,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follow_ups_branch_status" ON "follow_ups" ("branch_id","status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follow_ups_assignee_status" ON "follow_ups" ("assigned_to","status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follow_ups_scheduled" ON "follow_ups" ("scheduled_date")`);

    // ─── follow_up_contact_logs ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_up_contact_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "follow_up_id" uuid NOT NULL REFERENCES "follow_ups"("id") ON DELETE CASCADE,
        "method" "follow_up_contact_method_enum" NOT NULL,
        "outcome" "follow_up_contact_outcome_enum" NOT NULL,
        "notes" text NULL,
        "contacted_at" timestamp with time zone NOT NULL,
        "contacted_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follow_up_logs_followup_at" ON "follow_up_contact_logs" ("follow_up_id","contacted_at")`);

    // ─── follow_up_saved_filters ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_up_saved_filters" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "name" varchar NOT NULL,
        "filters" jsonb NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follow_up_saved_user_branch" ON "follow_up_saved_filters" ("user_id","branch_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_up_saved_filters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_up_contact_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_ups"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_contact_outcome_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_contact_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_ups_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_ups_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_ups_type_enum"`);
  }
}
