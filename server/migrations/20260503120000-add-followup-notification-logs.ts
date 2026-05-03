import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddFollowupNotificationLogs20260503120000 implements MigrationInterface {
  name = "AddFollowupNotificationLogs20260503120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_notification_logs_type_enum" AS ENUM (
          'assigned','completed_admin','overdue_7d','high_priority_daily'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_notification_logs_channel_enum" AS ENUM ('in_app','email');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_up_notification_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "follow_up_id" uuid NOT NULL REFERENCES "follow_ups"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" "follow_up_notification_logs_type_enum" NOT NULL,
        "channel" "follow_up_notification_logs_channel_enum" NOT NULL,
        "sent_for_date" date NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_follow_up_notification_once_per_day" UNIQUE ("follow_up_id", "user_id", "type", "channel", "sent_for_date")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follow_up_notification_user" ON "follow_up_notification_logs" ("user_id", "created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_up_notification_logs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_notification_logs_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_notification_logs_type_enum"`);
  }
}