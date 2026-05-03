import cron from "node-cron";
import { AppDataSource } from "../config/database";
import { Event, EventStatus, RecurrencePattern, MonthlyRecurrenceType } from "../models/event";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });

// Event times are stored in local (church) time. Render servers run UTC,
// so we must convert NOW() to the local timezone before comparing.
const TZ = process.env.APP_TIMEZONE || "Africa/Lagos";

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
 * Mark published events whose start time has arrived as ONGOING:
 *   status = PUBLISHED, is_published = true, (date || ' ' || time_from)::timestamp <= NOW()
 *   AND (date || ' ' || time_to)::timestamp >= NOW()
 */
async function markOngoingEvents(): Promise<void> {
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

  if (result.affected && result.affected > 0) {
    logger.info(`[CronService] Marked ${result.affected} event(s) as ongoing`);
  }
}

/**
 * Close published/ongoing events whose end time has elapsed:
 *   (date || ' ' || time_to)::timestamp < NOW()
 */
async function closeElapsedEvents(): Promise<void> {
  const repo = AppDataSource.getRepository(Event);
  const result = await repo
    .createQueryBuilder()
    .update(Event)
    .set({ status: EventStatus.CLOSED, is_published: false })
    .where("status IN (:...statuses)", { statuses: [EventStatus.PUBLISHED, EventStatus.ONGOING] })
    .andWhere("(date::text || ' ' || time_to)::timestamp < (NOW() AT TIME ZONE :tz)", { tz: TZ })
    .execute();

  if (result.affected && result.affected > 0) {
    logger.info(`[CronService] Closed ${result.affected} elapsed event(s)`);
  }
}

/**
 * Auto-open event attendance once the event start time has been reached.
 * Skips events whose attendance was manually set to "open" or "closed".
 */
async function openAttendanceAtStart(): Promise<void> {
  const repo = AppDataSource.getRepository(Event);
  const result = await repo
    .createQueryBuilder()
    .update(Event)
    .set({ attendance_status: "open" })
    .where("accept_attendance = true")
    .andWhere("(date::text || ' ' || time_from)::timestamp <= (NOW() AT TIME ZONE :tz)", { tz: TZ })
    .andWhere(
      "(date::text || ' ' || time_to)::timestamp + interval '2 hours' > (NOW() AT TIME ZONE :tz)",
      { tz: TZ }
    )
    .andWhere("(attendance_status IS NULL OR attendance_status = 'scheduled')")
    .execute();

  if (result.affected && result.affected > 0) {
    logger.info(`[CronService] Opened attendance for ${result.affected} event(s)`);
  }
}

/**
 * Auto-close event attendance once 2 hours have elapsed past the event end time.
 */
async function closeAttendanceAfterEnd(): Promise<void> {
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

  if (result.affected && result.affected > 0) {
    logger.info(`[CronService] Closed attendance for ${result.affected} event(s)`);
  }
}

// ── Recurring-event helpers ────────────────────────────────────────────────

/** Return the next ISO date string (YYYY-MM-DD) for a weekly pattern with specific days. */
function nextWeeklyDate(fromDate: Date, days: number[], weekMultiplier: number): Date {
  const sorted = [...days].sort((a, b) => a - b);
  const dow = fromDate.getDay();
  const later = sorted.find((d) => d > dow);
  if (later !== undefined) {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + (later - dow));
    return next;
  }
  // Wrap to first matching day in the next cycle
  const next = new Date(fromDate);
  next.setDate(next.getDate() + (7 * weekMultiplier - dow + sorted[0]));
  return next;
}

/** Return the date of the Nth occurrence of a weekday in a given year/month. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const date = new Date(year, month, 1 + offset + (nth - 1) * 7);
  return date.getMonth() === month ? date : null;
}

/** Return the last occurrence of a weekday in a given year/month. */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0); // last day of month
  const offset = (last.getDay() - weekday + 7) % 7;
  last.setDate(last.getDate() - offset);
  return last;
}

const ORDINAL_MAP: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };
const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

/** Calculate the next occurrence date for a recurring event one step forward. */
function getNextOccurrenceDate(event: Event): Date | null {
  const current = new Date(event.date + "T00:00:00");

  switch (event.recurrence_pattern) {
    case RecurrencePattern.DAILY: {
      const next = new Date(current);
      next.setDate(next.getDate() + 1);
      return next;
    }

    case RecurrencePattern.WEEKLY: {
      if (event.recurrence_days?.length) {
        return nextWeeklyDate(current, event.recurrence_days, 1);
      }
      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      return next;
    }

    case RecurrencePattern.EVERY_2_WEEKS: {
      if (event.recurrence_days?.length) {
        return nextWeeklyDate(current, event.recurrence_days, 2);
      }
      const next = new Date(current);
      next.setDate(next.getDate() + 14);
      return next;
    }

    case RecurrencePattern.MONTHLY: {
      const y = current.getFullYear();
      const m = current.getMonth() + 1; // next month
      if (event.monthly_type === MonthlyRecurrenceType.DAY_OF_MONTH && event.monthly_day) {
        const lastDayOfNextMonth = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(event.monthly_day, lastDayOfNextMonth));
      }
      if (event.monthly_type === MonthlyRecurrenceType.DAY_OF_WEEK && event.monthly_week_descriptor) {
        const parts = event.monthly_week_descriptor.toLowerCase().split("_");
        const weekday = DAY_MAP[parts[parts.length - 1]];
        if (weekday === undefined) return null;
        if (parts[0] === "last") return lastWeekdayOfMonth(y, m, weekday);
        const nth = ORDINAL_MAP[parts[0]];
        if (!nth) return null;
        return nthWeekdayOfMonth(y, m, weekday, nth);
      }
      // fallback: same day next month
      const next = new Date(current);
      next.setMonth(next.getMonth() + 1);
      return next;
    }

    case RecurrencePattern.QUARTERLY: {
      const next = new Date(current);
      next.setMonth(next.getMonth() + 3);
      return next;
    }

    case RecurrencePattern.YEARLY: {
      const next = new Date(current);
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }

    default:
      return null;
  }
}

/**
 * For each CLOSED recurring event, advance its date to the next valid
 * occurrence and re-publish it, unless the recurrence end date has passed.
 */
export async function scheduleRecurringEvents(): Promise<void> {
  const repo = AppDataSource.getRepository(Event);

  // Only fetch the columns we need to minimise memory footprint
  const events = await repo.find({
    where: { is_recurring: true, status: EventStatus.CLOSED },
    select: ["id", "date", "recurrence_pattern", "recurrence_days",
             "monthly_type", "monthly_day", "monthly_week_descriptor",
             "recurrence_end_date"],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute all required updates in JS first, then flush in one batch
  const updates: Array<{ id: string; date: string }> = [];

  for (const event of events) {
    if (!event.recurrence_pattern) continue;

    if (event.recurrence_end_date && new Date(event.recurrence_end_date) < today) continue;

    // Advance using only the date string — no object spread needed
    let nextDate = getNextOccurrenceDate(event);
    let iterations = 0;
    while (nextDate && nextDate < today && iterations < 365) {
      // Temporarily mutate only the date field on a plain stub, avoiding a full spread
      const stub = { date: nextDate.toISOString().split("T")[0], recurrence_pattern: event.recurrence_pattern,
                     recurrence_days: event.recurrence_days, monthly_type: event.monthly_type,
                     monthly_day: event.monthly_day, monthly_week_descriptor: event.monthly_week_descriptor } as Event;
      nextDate = getNextOccurrenceDate(stub);
      iterations++;
    }

    if (!nextDate) continue;
    if (event.recurrence_end_date && nextDate > new Date(event.recurrence_end_date)) continue;

    updates.push({ id: event.id, date: nextDate.toISOString().split("T")[0] });
  }

  if (updates.length === 0) return;

  // Single bulk UPDATE using CASE … WHEN to avoid N round-trips
  await AppDataSource.createQueryBuilder()
    .update(Event)
    .set({
      status: EventStatus.PUBLISHED,
      is_published: true,
      publish_at: null,
      date: () =>
        `(CASE id ${updates.map((u) => `WHEN '${u.id}' THEN '${u.date}'`).join(" ")} END)::date`,
    })
    .whereInIds(updates.map((u) => u.id))
    .execute();

  logger.info(`[CronService] Rescheduled ${updates.length} recurring event(s)`);
}

/**
 * Follow-up automation, run hourly:
 *   • Escalate overdue follow-ups to URGENT priority
 *   • Detect absent members per-branch and create absent_member follow-ups
 *   • Detect today's birthdays per-branch and create birthday follow-ups
 */
async function processFollowUpAutomation(): Promise<void> {
  try {
    const { FollowUpService } = await import("./follow-up.service");
    const svc = new FollowUpService();

    const escalated = await svc.escalateOverdue(3);
    if (escalated > 0) logger.info(`[CronService] Escalated ${escalated} overdue follow-up(s)`);

    const overdueNotifications = await svc.notifySevenDayOverdue();
    if (overdueNotifications > 0) logger.info(`[CronService] Sent ${overdueNotifications} overdue follow-up notification recipient(s)`);

    const highPriorityReminders = await svc.notifyHighPriorityDaily();
    if (highPriorityReminders > 0) logger.info(`[CronService] Sent ${highPriorityReminders} high-priority follow-up reminder recipient(s)`);

    // Per-branch automation
    const branchRows: { id: string }[] = await AppDataSource.query(
      `SELECT id FROM branches`,
    );
    let absentTotal = 0;
    let birthdaysTotal = 0;
    for (const b of branchRows) {
      try {
        absentTotal += await svc.detectAbsenteesForBranch(b.id, 1);
        birthdaysTotal += await svc.detectBirthdaysForBranch(b.id);
      } catch (err) {
        logger.error(`[CronService] FollowUp automation failed for branch ${b.id}:`, err);
      }
    }
    if (absentTotal > 0) logger.info(`[CronService] Created ${absentTotal} absent-member follow-up(s)`);
    if (birthdaysTotal > 0) logger.info(`[CronService] Created ${birthdaysTotal} birthday follow-up(s)`);
  } catch (err) {
    logger.error("[CronService] Follow-up automation error:", err);
  }
}

export function startCronJobs(): void {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      await publishScheduledEvents();
      // Mark events as ongoing once their start time arrives
      await markOngoingEvents();
      // Close events after ongoing check so a same-minute event can be marked first
      await closeElapsedEvents();
      // Attendance window automation
      await openAttendanceAtStart();
      await closeAttendanceAfterEnd();
      // Reschedule recurring events whose latest occurrence just closed
      await scheduleRecurringEvents();
    } catch (err) {
      logger.error("[CronService] Error during scheduled jobs:", err);
    }
  });

  // Follow-up automation runs hourly (cheaper, branch-wide scan)
  cron.schedule("0 * * * *", async () => {
    await processFollowUpAutomation();
  });

  logger.info("[CronService] Scheduled jobs started (events: every min, follow-ups: hourly)");
}

export { processFollowUpAutomation };

