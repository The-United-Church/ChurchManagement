import cron from "node-cron";
import { AppDataSource } from "../config/database";
import { Event, EventStatus } from "../models/event";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });

/**
 * Promote events whose scheduled publish_at has arrived:
 *   status = PUBLISHED, is_published = false, publish_at <= NOW()
 * Sets is_published = true so they become visible to members.
 */
async function publishScheduledEvents(): Promise<void> {
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

  if (result.affected && result.affected > 0) {
    logger.info(`[CronService] Published ${result.affected} scheduled event(s)`);
  }
}

/**
 * Close published events whose end time has elapsed:
 *   (date || ' ' || time_to)::timestamp < NOW()
 */
async function closeElapsedEvents(): Promise<void> {
  const repo = AppDataSource.getRepository(Event);
  const result = await repo
    .createQueryBuilder()
    .update(Event)
    .set({ status: EventStatus.CLOSED, is_published: false })
    .where("status = :published", { published: EventStatus.PUBLISHED })
    .andWhere("(date::text || ' ' || time_to)::timestamp < NOW()")
    .execute();

  if (result.affected && result.affected > 0) {
    logger.info(`[CronService] Closed ${result.affected} elapsed event(s)`);
  }
}

export function startCronJobs(): void {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      await publishScheduledEvents();
      // Close events after publish check so a same-minute event can be published first
      await closeElapsedEvents();
    } catch (err) {
      logger.error("[CronService] Error during scheduled jobs:", err);
    }
  });

  logger.info("[CronService] Scheduled jobs started (every minute)");
}

