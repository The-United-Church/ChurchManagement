/**
 * Standalone job: scheduleRecurringEvents
 *
 * For each CLOSED recurring event, advances its date to the next valid
 * occurrence and re-publishes it (unless the recurrence end date has passed).
 * Recommended schedule: hourly  →  "0 * * * *"
 *
 * Run locally:
 *   npm run job:recurring-events
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { scheduleRecurringEvents } from "../services/cron.service";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });

async function run(): Promise<void> {
  await AppDataSource.initialize();
  await scheduleRecurringEvents();
}

run()
  .then(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error("[scheduleRecurringEvents] Fatal:", err);
    try { await AppDataSource.destroy(); } catch { /* ignore */ }
    process.exit(1);
  });
