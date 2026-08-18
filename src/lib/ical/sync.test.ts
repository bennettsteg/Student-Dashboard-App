import http from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { syncBlackboardCalendarForUser } from "./sync";

// Requires a reachable DATABASE_URL (see README / .env) - this exercises the real
// upsert logic against Postgres since it's the highest-risk correctness code in the app.

function buildIcs(events: string[]): string {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//Test//EN\r\n${events.join("")}END:VCALENDAR\r\n`;
}

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

const now = new Date();
const start1 = new Date(now.getTime() + 24 * 3600 * 1000);
const end1 = new Date(start1.getTime() + 3600 * 1000);
const start2 = new Date(now.getTime() + 48 * 3600 * 1000);
const end2 = new Date(start2.getTime() + 3600 * 1000);

function event1(summary: string): string {
  return `BEGIN:VEVENT\r\nUID:sync-test-event-1@test\r\nDTSTAMP:${fmt(now)}\r\nDTSTART:${fmt(start1)}\r\nDTEND:${fmt(end1)}\r\nSUMMARY:CS 201: ${summary}\r\nEND:VEVENT\r\n`;
}
function event2(): string {
  return `BEGIN:VEVENT\r\nUID:sync-test-event-2@test\r\nDTSTAMP:${fmt(now)}\r\nDTSTART:${fmt(start2)}\r\nDTEND:${fmt(end2)}\r\nSUMMARY:CS 201: Homework 2 due\r\nEND:VEVENT\r\n`;
}

describe("syncBlackboardCalendarForUser", () => {
  let server: http.Server;
  let url: string;
  let userId: string;
  let currentIcs = buildIcs([event1("Homework 1 due"), event2()]);

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/calendar" });
      res.end(currentIcs);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;
    url = `http://localhost:${port}/feed.ics`;

    const user = await prisma.user.upsert({
      where: { email: "vitest-sync@example.com" },
      update: {},
      create: { email: "vitest-sync@example.com", name: "Vitest Sync Test" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("creates events on first sync, storing the course name as reference only (no Course row)", async () => {
    const result = await syncBlackboardCalendarForUser(userId, url);
    expect(result.created).toBe(2);

    const rows = await prisma.calendarEvent.findMany({ where: { userId }, include: { course: true } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.sourceCourseName === "CS 201")).toBe(true);
    expect(rows.every((r) => r.courseId === null)).toBe(true);

    const courses = await prisma.course.findMany({ where: { userId } });
    expect(courses).toHaveLength(0);
  });

  it("is idempotent on an unchanged resync", async () => {
    const result = await syncBlackboardCalendarForUser(userId, url);
    expect(result).toMatchObject({ created: 0, updated: 0, unchanged: 2 });

    const rows = await prisma.calendarEvent.findMany({ where: { userId } });
    expect(rows).toHaveLength(2);
  });

  it("never overwrites an event the user has edited", async () => {
    const existing = await prisma.calendarEvent.findFirstOrThrow({
      where: { userId, externalUid: "sync-test-event-1@test" },
    });
    await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: { title: "My custom title", userModified: true },
    });

    currentIcs = buildIcs([event1("Homework 1 due (extended)"), event2()]);
    const result = await syncBlackboardCalendarForUser(userId, url);
    expect(result.skippedUserModified).toBe(1);

    const after = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: existing.id } });
    expect(after.title).toBe("My custom title");
  });

  it("marks a removed event CANCELLED instead of deleting it", async () => {
    currentIcs = buildIcs([event1("Homework 1 due (extended)")]);
    const result = await syncBlackboardCalendarForUser(userId, url);
    expect(result.cancelled).toBe(1);

    const removed = await prisma.calendarEvent.findFirstOrThrow({
      where: { userId, externalUid: "sync-test-event-2@test" },
    });
    expect(removed.status).toBe("CANCELLED");
  });
});
