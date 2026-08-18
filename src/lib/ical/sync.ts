import { createHash } from "node:crypto";

import { prisma } from "@/lib/db";
import { fetchIcsFeed } from "@/lib/ical/fetchFeed";
import { parseIcsFeed, type NormalizedEvent } from "@/lib/ical/parse";

const SYNC_WINDOW_MONTHS_PAST = 1;
const SYNC_WINDOW_MONTHS_FUTURE = 12;

function contentHash(event: NormalizedEvent): string {
  const payload = JSON.stringify({
    title: event.title,
    courseName: event.courseName,
    description: event.description,
    location: event.location,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    allDay: event.allDay,
    isAssignment: event.isAssignment,
    dueAt: event.dueAt?.toISOString() ?? null,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  cancelled: number;
  skippedUserModified: number;
}

export async function syncBlackboardCalendarForUser(
  userId: string,
  icsUrl: string,
): Promise<SyncResult> {
  const feed = await fetchIcsFeed(icsUrl);

  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - SYNC_WINDOW_MONTHS_PAST);
  const to = new Date(now);
  to.setMonth(to.getMonth() + SYNC_WINDOW_MONTHS_FUTURE);

  const normalizedEvents = parseIcsFeed(feed, { from, to });

  const existingRows = await prisma.calendarEvent.findMany({
    where: { userId, source: "BLACKBOARD_ICS", status: "ACTIVE" },
    select: { id: true, externalUid: true, recurrenceId: true, userModified: true, lastSyncedHash: true },
  });
  const existingByKey = new Map(
    existingRows.map((row) => [`${row.externalUid}|${row.recurrenceId ?? ""}`, row]),
  );

  const result: SyncResult = { created: 0, updated: 0, unchanged: 0, cancelled: 0, skippedUserModified: 0 };
  const seenKeys = new Set<string>();

  for (const event of normalizedEvents) {
    const key = `${event.uid}|${event.recurrenceId}`;
    seenKeys.add(key);
    const existing = existingByKey.get(key);
    const hash = contentHash(event);

    if (!existing) {
      await prisma.calendarEvent.create({
        data: {
          userId,
          title: event.title,
          sourceCourseName: event.courseName,
          description: event.description,
          location: event.location,
          startAt: event.start,
          endAt: event.end,
          allDay: event.allDay,
          source: "BLACKBOARD_ICS",
          externalUid: event.uid,
          recurrenceId: event.recurrenceId,
          lastSyncedHash: hash,
          isAssignment: event.isAssignment,
          dueAt: event.dueAt,
        },
      });
      result.created++;
      continue;
    }

    if (existing.userModified) {
      result.skippedUserModified++;
      continue;
    }

    if (existing.lastSyncedHash === hash) {
      result.unchanged++;
      continue;
    }

    await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        title: event.title,
        sourceCourseName: event.courseName,
        description: event.description,
        location: event.location,
        startAt: event.start,
        endAt: event.end,
        allDay: event.allDay,
        lastSyncedHash: hash,
        isAssignment: event.isAssignment,
        dueAt: event.dueAt,
        status: "ACTIVE",
      },
    });
    result.updated++;
  }

  const disappeared = existingRows.filter(
    (row) => !row.userModified && !seenKeys.has(`${row.externalUid}|${row.recurrenceId ?? ""}`),
  );
  if (disappeared.length > 0) {
    await prisma.calendarEvent.updateMany({
      where: { id: { in: disappeared.map((row) => row.id) } },
      data: { status: "CANCELLED" },
    });
    result.cancelled = disappeared.length;
  }

  return result;
}

export async function syncBlackboardCalendarForAllUsers(icsUrl: string): Promise<Record<string, SyncResult>> {
  const users = await prisma.user.findMany({ select: { id: true } });
  const results: Record<string, SyncResult> = {};
  for (const user of users) {
    results[user.id] = await syncBlackboardCalendarForUser(user.id, icsUrl);
  }
  return results;
}
