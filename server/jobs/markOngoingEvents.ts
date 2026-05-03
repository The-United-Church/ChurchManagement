/**
 * Standalone job: markOngoingEvents
 *
 * Marks published events whose start time has been reached as ONGOING.
 * Recommended schedule: every minute  →  "* * * * *"
 *
 * Run locally:
 *   npm run job:mark-ongoing
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { Event, EventStatus } from "../models/event";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });
const TZ = process.env.APP_TIMEZONE || "Africa/Lagos";

async function run(): Promise<void> {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(Event);
  const result = await repo
    .createQueryBuilder()
    .update(Event)
    .set({ status: EventStatus.ONGOING })
    .where("status = :published", { published: EventStatus.PUBLISHED })
    .andWhere("is_published = true")
    .andWhere("(date::text || ' ' || time_from)::timestamp <= (NOW() AT TIME ZONE :tz)", { tz: TZ })
    .andWhere("(date::text || ' ' || time_to)::timestamp >= (NOW() AT TIME ZONE :tz)", { tz: TZ })
    .execute();

  logger.info(`[markOngoingEvents] Marked ongoing: ${result.affected ?? 0}`);
}

run()
  .then(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error("[markOngoingEvents] Fatal:", err);
    try { await AppDataSource.destroy(); } catch { /* ignore */ }
    process.exit(1);
  });
