import { prisma } from "@/lib/db";
import { isDueToday } from "@/lib/assignments/status";
import { localDate } from "@/lib/time";
import {
  buildLastChanceReminderPayload,
  buildMorningReminderPayload,
  type PushPayload,
} from "@/lib/push/payload";
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

// The two Reminder kinds, each with its own time-of-day field, its own "already sent today" and
// "last failed" bookkeeping fields on `ReminderState`, and its own payload wording. Both share
// the one `remindersEnabled` switch and are evaluated independently, so either can fire on its
// own schedule and both can fire the same local day.
const REMINDER_KINDS = [
  {
    name: "morning",
    reminderTimeField: "morningReminderTime",
    sentDateField: "morningSentLocalDate",
    failedAtField: "morningFailedAt",
    buildPayload: buildMorningReminderPayload,
  },
  {
    name: "lastChance",
    reminderTimeField: "lastChanceReminderTime",
    sentDateField: "lastChanceSentLocalDate",
    failedAtField: "lastChanceFailedAt",
    buildPayload: buildLastChanceReminderPayload,
  },
] as const satisfies {
  name: string;
  reminderTimeField: "morningReminderTime" | "lastChanceReminderTime";
  sentDateField: "morningSentLocalDate" | "lastChanceSentLocalDate";
  failedAtField: "morningFailedAt" | "lastChanceFailedAt";
  buildPayload: (dueTodayCount: number) => PushPayload;
}[];

/**
 * One tick of the daily Reminders, called by the worker every few minutes. For every user with
 * Reminders switched on it evaluates the Reminder guard, independently for the Morning Reminder
 * and the Last-chance Reminder, from persisted state and the local database only (no Graph or
 * other external call apart from the push itself), and sends one count-only digest per
 * subscribed device to those that are due.
 *
 * Holds no state between calls, so a worker restart or repeated ticks cannot resend: each
 * Reminder's local date is recorded in its own `ReminderState` field. What gets recorded, per
 * Reminder:
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
    select: {
      id: true,
      timezone: true,
      morningReminderTime: true,
      lastChanceReminderTime: true,
      reminderState: true,
    },
  });

  const result: ReminderTickResult = { checked: users.length, due: 0, delivered: 0, errors: 0 };
  for (const user of users) {
    try {
      // Computed at most once per user per tick, and only if some Reminder could actually be
      // due, even though both kinds may need it.
      let dueTodayCount: number | null = null;
      const getDueTodayCount = async () => {
        dueTodayCount ??= await countDueToday(user.id, now, user.timezone);
        return dueTodayCount;
      };

      for (const kind of REMINDER_KINDS) {
        const guard = {
          remindersEnabled: true,
          reminderTime: user[kind.reminderTimeField],
          timeZone: user.timezone,
          lastSentLocalDate: user.reminderState?.[kind.sentDateField] ?? null,
          lastFailedAt: user.reminderState?.[kind.failedAtField] ?? null,
          now,
        };
        // Cheap checks first, so the database is only asked for Assignments when a Reminder
        // could actually be due.
        if (!reminderDue({ ...guard, dueTodayCount: 1 })) continue;

        const count = await getDueTodayCount();
        if (!reminderDue({ ...guard, dueTodayCount: count })) continue;

        result.due++;
        const sent = await sendPushToUser(user.id, kind.buildPayload(count), {
          sender: deps.sender,
          env: deps.env,
        });

        if (sent.error) {
          result.errors++;
          console.error(`[worker] ${kind.name} reminder for user ${user.id} not sent: ${sent.error}`);
          continue;
        }
        if (sent.sent + sent.removed + sent.failed === 0) continue; // no device registered

        if (sent.sent === 0 && sent.failed > 0) {
          // Nothing was accepted and at least one device failed transiently: try again after
          // the retry delay, until the local day ends.
          await prisma.reminderState.upsert({
            where: { userId: user.id },
            create: { userId: user.id, [kind.failedAtField]: now },
            update: { [kind.failedAtField]: now },
          });
          continue;
        }

        const today = localDate(now, user.timezone);
        await prisma.reminderState.upsert({
          where: { userId: user.id },
          create: { userId: user.id, [kind.sentDateField]: today },
          update: { [kind.sentDateField]: today, [kind.failedAtField]: null },
        });
        if (sent.sent > 0) result.delivered++;
      }
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
