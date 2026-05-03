/**
 * Standalone job: closeAttendanceAfterEnd
 *
 * Auto-closes event attendance 2 hours after the event end time.
 * Only flips events whose attendance is not already 'closed'.
 * Recommended schedule: every 5 minutes.
 *
 * Run locally:
 *   npm run job:close-attendance
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { Event } from "../models/event";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });
const TZ = process.env.APP_TIMEZONE || "Africa/Lagos";

async function run(): Promise<void> {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(Event);
  const result = await repo
    .createQueryBuilder()
    .update(Event)
    .set({ attendance_status: "closed" })
    .where("accept_attendance = true")
    .andWhere(
      "(date::text || ' ' || time_to)::timestamp + interval '2 hours' <= (NOW() AT TIME ZONE :tz)",
      { tz: TZ }
    )
    .andWhere("(attendance_status IS NULL OR attendance_status <> 'closed')")
    .execute();

  logger.info(`[closeAttendanceAfterEnd] Attendance closed: ${result.affected ?? 0}`);
}

run()
  .then(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error("[closeAttendanceAfterEnd] Fatal:", err);
    try { await AppDataSource.destroy(); } catch { /* ignore */ }
    process.exit(1);
  });
