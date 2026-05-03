/**
 * Standalone job: publishScheduledEvents
 *
 * Promotes events whose publish_at has arrived to visible (is_published = true).
 * Recommended schedule: every 5 minutes  →  every-5-min cron
 *
 * Run locally:
 *   npm run job:publish-events
 * 
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { Event, EventStatus } from "../models/event";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });

async function run(): Promise<void> {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(Event);
  const result = await repo
    .createQueryBuilder()
    .update(Event)
    .set({ is_published: true })
    .where("status = :published", { published: EventStatus.PUBLISHED })
    .andWhere("is_published = false")
    .andWhere("publish_at IS NOT NULL")
    .andWhere("publish_at <= NOW()")
    .execute();

  logger.info(`[publishScheduledEvents] Published: ${result.affected ?? 0}`);
}

run()
  .then(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error("[publishScheduledEvents] Fatal:", err);
    try { await AppDataSource.destroy(); } catch { /* ignore */ }
    process.exit(1);
  });
