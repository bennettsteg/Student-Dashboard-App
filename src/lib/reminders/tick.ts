import { prisma } from "@/lib/db";
import { isDueToday } from "@/lib/assignments/status";
import { localDate } from "@/lib/time";
import { buildReminderPayload } from "@/lib/push/payload";
import { sendPushToUser, type SendOptions } from "@/lib/push/send";

import { reminderDue } from "./guard";

export interface ReminderTickDeps {
  now?: () => Date;
  /** Replaces web-push + VAPID; for tests. */
  sender?: SendOptions["sender"];
  /** Environment to read VAPID keys from (default process.env); ignored when `sender` is given. */
  env?: SendOptions["env"];
}

export interface ReminderTickResult {
  /** Users with Reminders switched on that the tick looked at. */
  checked: number;
  /** Users the guard said were due, so a digest was attempted. */
  due: number;
  /** Users for whom at least one device accepted the push. */
  delivered: number;
  /** Users whose digest could not be attempted or whose evaluation threw. */
  errors: number;
}

// A local calendar day is at most ~26 hours away from `now` in either direction for any
// timezone, so this window always contains every instant of the user's "today".
const DAY_WINDOW_MS = 30 * 60 * 60 * 1000;

/**
 * One tick of the daily Reminder, called by the worker every few minutes. For every user with
 * Reminders switched on it evaluates the Reminder guard from persisted state and the local
 * database only (no Graph or other external call apart from the push itself), and sends one
 * count-only digest per subscribed device to those that are due.
 *
 * Holds no state between calls, so a worker restart or repeated ticks cannot resend: the user's
 * local date is recorded in `ReminderState`. What gets recorded:
 *  - at least one device accepted the push, or every device was reported gone: record today.
 *    Accepted devices must not be sent to twice. A device that failed transiently while another
 *    accepted keeps its registration and receives tomorrow's digest.
 *  - no device accepted it and at least one failed transiently (push-service outage, network):
 *    record the failure time only. The guard retries after REMINDER_RETRY_MS, until the local
 *    day ends; nothing was accepted, so a retry cannot duplicate.
 *  - no device registered: record nothing. Nothing was sent, so there is nothing to duplicate,
 *    and a device enabled later the same day still gets today's Reminder on the next tick.
 *  - pushes cannot be sent at all (VAPID not configured): record nothing, log the error, and
 *    send as soon as the server is fixed the same day.
 */
export async function runReminderTick(
  options: { deps?: ReminderTickDeps } = {},
): Promise<ReminderTickResult> {
  const deps = options.deps ?? {};
  const now = (deps.now ?? (() => new Date()))();

  const users = await prisma.user.findMany({
    where: { remindersEnabled: true },
    select: { id: true, timezone: true, reminderTime: true, reminderState: true },
  });

  const result: ReminderTickResult = { checked: users.length, due: 0, delivered: 0, errors: 0 };
  for (const user of users) {
    try {
      const guard = {
        remindersEnabled: true,
        reminderTime: user.reminderTime,
        timeZone: user.timezone,
        lastSentLocalDate: user.reminderState?.lastSentLocalDate ?? null,
        lastFailedAt: user.reminderState?.lastFailedAt ?? null,
        now,
      };
      // Cheap checks first, so the database is only asked for Assignments when a Reminder
      // could actually be due.
      if (!reminderDue({ ...guard, dueTodayCount: 1 })) continue;

      const dueTodayCount = await countDueToday(user.id, now, user.timezone);
      if (!reminderDue({ ...guard, dueTodayCount })) continue;

      result.due++;
      const sent = await sendPushToUser(user.id, buildReminderPayload(dueTodayCount), {
        sender: deps.sender,
        env: deps.env,
      });

      if (sent.error) {
        result.errors++;
        console.error(`[worker] reminder for user ${user.id} not sent: ${sent.error}`);
        continue;
      }
      if (sent.sent + sent.removed + sent.failed === 0) continue; // no device registered

      if (sent.sent === 0 && sent.failed > 0) {
        // Nothing was accepted and at least one device failed transiently: try again after the
        // retry delay, until the local day ends.
        await prisma.reminderState.upsert({
          where: { userId: user.id },
          create: { userId: user.id, lastFailedAt: now },
          update: { lastFailedAt: now },
        });
        continue;
      }

      const today = localDate(now, user.timezone);
      await prisma.reminderState.upsert({
        where: { userId: user.id },
        create: { userId: user.id, lastSentLocalDate: today },
        update: { lastSentLocalDate: today, lastFailedAt: null },
      });
      if (sent.sent > 0) result.delivered++;
    } catch (e) {
      // One user's bad data (say, an unknown timezone) must not stop the others.
      result.errors++;
      console.error(
        `[worker] reminder for user ${user.id} failed:`,
        e instanceof Error ? e.message : e,
      );
    }
  }
  return result;
}

async function countDueToday(userId: string, now: Date, timeZone: string): Promise<number> {
  const candidates = await prisma.assignment.findMany({
    where: {
      userId,
      dueAt: {
        gte: new Date(now.getTime() - DAY_WINDOW_MS),
        lte: new Date(now.getTime() + DAY_WINDOW_MS),
      },
    },
    select: { dueAt: true },
  });
  return candidates.filter((a) => isDueToday(a.dueAt, now, timeZone)).length;
}
