/**
 * Standalone job: processFollowUps
 *
 * Runs hourly via Render Cron (or local: npm run job:followups).
 * - Escalates overdue follow-ups
 * - Auto-creates absent-member and birthday follow-ups for every branch
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { Logger } from "../utils/logger";
import { FollowUpService } from "../services/follow-up.service";

const logger = new Logger({ level: "info" });

async function run(): Promise<void> {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  const svc = new FollowUpService();

  const escalated = await svc.escalateOverdue(3);
  logger.info(`[FollowUps] Escalated ${escalated} overdue follow-up(s)`);

  const overdueNotifications = await svc.notifySevenDayOverdue();
  logger.info(`[FollowUps] Sent ${overdueNotifications} overdue notification recipient(s)`);

  const highPriorityReminders = await svc.notifyHighPriorityDaily();
  logger.info(`[FollowUps] Sent ${highPriorityReminders} high-priority reminder recipient(s)`);

  const branches: { id: string }[] = await AppDataSource.query(`SELECT id FROM branches`);
  let absent = 0;
  let bday = 0;
  for (const b of branches) {
    try {
      absent += await svc.detectAbsenteesForBranch(b.id, 1);
      bday += await svc.detectBirthdaysForBranch(b.id);
    } catch (err) {
      logger.error(`[FollowUps] Branch ${b.id} failed:`, err);
    }
  }
  logger.info(`[FollowUps] Created ${absent} absent-member, ${bday} birthday follow-up(s)`);
}

run()
  .then(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error("[FollowUps] Job failed:", err);
    try {
      await AppDataSource.destroy();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
