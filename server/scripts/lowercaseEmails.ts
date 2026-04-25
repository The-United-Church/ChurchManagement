/**
 * One-shot maintenance script: lowercase every existing email in the `users`
 * and `persons` tables.
 *
 * Why: historical accounts were stored with mixed-case emails (e.g.
 * "John.Doe@example.com"), which caused duplicate-account collisions and
 * inconsistent lookups. Going forward, the application normalizes emails on
 * input (see server/utils/email.ts), but legacy rows still need a one-time
 * cleanup.
 *
 * Run:
 *   npx ts-node server/scripts/lowercaseEmails.ts
 *   — or —
 *   npm --prefix server run script:lowercase-emails
 *
 * Notes:
 *   • Idempotent: safe to re-run.
 *   • Conflict-safe: if lowercasing would create a duplicate, the script
 *     reports the affected rows and skips them — operators must reconcile
 *     duplicates manually before re-running.
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });

interface ConflictRow {
  table: string;
  email: string;
  ids: string[];
}

async function detectConflicts(table: "users" | "people"): Promise<ConflictRow[]> {
  const rows: Array<{ lowered: string; ids: string }> = await AppDataSource.query(
    `
    SELECT LOWER(email) AS lowered, string_agg(id::text, ',') AS ids
    FROM ${table}
    WHERE email IS NOT NULL AND email <> LOWER(email)
    GROUP BY LOWER(email)
    HAVING COUNT(*) FILTER (WHERE TRUE) > 1
       OR EXISTS (
         SELECT 1 FROM ${table} t2
         WHERE t2.email = LOWER(${table}.email) AND t2.id <> ${table}.id
       )
    `
  );
  return rows.map((r) => ({ table, email: r.lowered, ids: r.ids.split(",") }));
}

async function lowercaseColumn(table: "users" | "people"): Promise<number> {
  // Skip rows that would collide with an already-lowercase row of the same
  // address. Postgres will throw on a unique-constraint violation otherwise.
  const result: Array<{ count: string }> = await AppDataSource.query(
    `
    WITH updated AS (
      UPDATE ${table} AS t
      SET email = LOWER(t.email)
      WHERE t.email IS NOT NULL
        AND t.email <> LOWER(t.email)
        AND NOT EXISTS (
          SELECT 1 FROM ${table} t2
          WHERE t2.id <> t.id AND t2.email = LOWER(t.email)
        )
      RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
    `
  );
  return Number(result[0]?.count ?? 0);
}

async function run(): Promise<void> {
  await AppDataSource.initialize();
  logger.info("[lowercaseEmails] DB connected");

  try {
    for (const table of ["users", "people"] as const) {
      const conflicts = await detectConflicts(table);
      if (conflicts.length > 0) {
        logger.info(
          `[lowercaseEmails] ${table}: ${conflicts.length} email(s) cannot be lowercased ` +
            `because doing so would create a duplicate. Reconcile and re-run.`
        );
        for (const c of conflicts) {
          logger.info(`  • ${c.email} → ids: ${c.ids.join(", ")}`);
        }
      }

      const updated = await lowercaseColumn(table);
      logger.info(`[lowercaseEmails] ${table}: lowercased ${updated} row(s)`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("[lowercaseEmails] Fatal:", err);
    process.exit(1);
  });
