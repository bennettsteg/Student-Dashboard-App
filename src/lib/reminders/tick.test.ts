import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import type { PushSender } from "@/lib/push/send";

import { runReminderTick } from "./tick";

// Live-database tests (needs a reachable DATABASE_URL). One dedicated user is created in setup
// and deleted in teardown; only the push delivery is replaced by a fake sender. Every "tick" is
// a fresh call with only the database carrying state between them, as after a worker restart.

const RUN = `${process.pid}-${Date.now()}`;
const USER = `reminder-tick-${RUN}`;
const OTHER = `reminder-tick-other-${RUN}`;
const ENDPOINT_A = `https://push.example/${RUN}/a`;
const ENDPOINT_B = `https://push.example/${RUN}/b`;

// 2026-10-26 is a Monday; New York is on EDT (UTC-4). The reminder time is 08:00 local.
const EIGHT_AM = new Date("2026-10-26T12:00:00Z");
const SEVEN_AM = new Date("2026-10-26T11:00:00Z");
const NOON = new Date("2026-10-26T16:00:00Z");
const NEXT_DAY_NINE_AM = new Date("2026-10-27T13:00:00Z");

let courseId: string;

/** A fake push service: records what was sent per endpoint; `failWith` maps endpoint to a status. */
function fakeSender(failWith: Record<string, number> = {}) {
  const calls: { endpoint: string; body: { title: string; body: string; url: string } }[] = [];
  const sender: PushSender = async (subscription, body) => {
    const status = failWith[subscription.endpoint];
    if (status) throw Object.assign(new Error("push service said no"), { statusCode: status });
    calls.push({ endpoint: subscription.endpoint, body: JSON.parse(body) });
  };
  return { sender, calls };
}

/** Runs one tick at `now`; returns what the fake push service received for the test user. */
async function tick(now: Date, failWith: Record<string, number> = {}) {
  const push = fakeSender(failWith);
  const result = await runReminderTick({ deps: { now: () => now, sender: push.sender } });
  return { result, calls: push.calls.filter((c) => c.endpoint.includes(RUN)) };
}

async function addAssignment(dueAt: string, title = "Essay") {
  await prisma.assignment.create({ data: { userId: USER, courseId, title, dueAt: new Date(dueAt) } });
}

async function addDevice(endpoint: string) {
  await prisma.pushSubscription.create({ data: { userId: USER, endpoint, p256dh: "p", auth: "a" } });
}

async function lastSent() {
  const state = await prisma.reminderState.findUnique({ where: { userId: USER } });
  return state?.lastSentLocalDate ?? null;
}

beforeAll(async () => {
  await prisma.user.create({ data: { id: USER } });
  await prisma.user.create({ data: { id: OTHER } });
  const course = await prisma.course.create({
    data: { userId: USER, name: "Biology", daysOfWeek: [1], startTime: "09:00", endTime: "10:00" },
  });
  courseId = course.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [USER, OTHER] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.assignment.deleteMany({ where: { userId: USER } });
  await prisma.pushSubscription.deleteMany({ where: { userId: USER } });
  await prisma.reminderState.deleteMany({ where: { userId: USER } });
  await prisma.user.update({
    where: { id: USER },
    data: { timezone: "America/New_York", reminderTime: "08:00", remindersEnabled: true },
  });
  // Due at 11:59 PM local on the Monday: due today, still in the future at 08:00.
  await addAssignment("2026-10-27T03:59:00Z");
  await addDevice(ENDPOINT_A);
  await addDevice(ENDPOINT_B);
});

describe("runReminderTick", () => {
  it("sends one count-only digest per device at the reminder time and records the local date", async () => {
    const { calls } = await tick(EIGHT_AM);

    expect(calls.map((c) => c.endpoint).sort()).toEqual([ENDPOINT_A, ENDPOINT_B]);
    for (const call of calls) {
      expect(call.body).toEqual({ title: "StudyDesk", body: "1 assignment due today", url: "/assignments" });
    }
    expect(await lastSent()).toBe("2026-10-26");
  });

  it("counts only the Assignments due today in the student's timezone, and never shows titles", async () => {
    await addAssignment("2026-10-26T14:00:00Z", "Quiz: secret title"); // 10:00 local today
    await addAssignment("2026-10-27T04:30:00Z", "Tomorrow's lab"); // 00:30 local Tuesday
    await addAssignment("2026-10-26T03:00:00Z", "Yesterday's lab"); // 23:00 local Sunday

    const { calls } = await tick(EIGHT_AM);

    expect(calls[0].body.body).toBe("2 assignments due today");
    expect(JSON.stringify(calls)).not.toContain("secret title");
  });

  it("sends nothing before the reminder time, then sends once it is reached", async () => {
    const early = await tick(SEVEN_AM);
    expect(early.calls).toHaveLength(0);
    expect(await lastSent()).toBeNull();

    const onTime = await tick(EIGHT_AM);
    expect(onTime.calls).toHaveLength(2);
  });

  it("never sends a second Reminder on the same local day, across ticks or a restart", async () => {
    await tick(EIGHT_AM);

    for (const now of [new Date(EIGHT_AM.getTime() + 5 * 60_000), NOON]) {
      const again = await tick(now);
      expect(again.calls).toHaveLength(0);
    }
  });

  it("sends again the next local day when something is due then", async () => {
    await tick(EIGHT_AM);
    await addAssignment("2026-10-28T03:59:00Z"); // 11:59 PM local Tuesday

    const next = await tick(NEXT_DAY_NINE_AM);

    expect(next.calls).toHaveLength(2);
    expect(await lastSent()).toBe("2026-10-27");
  });

  it("sends nothing on a day with nothing due, and records nothing", async () => {
    await prisma.assignment.deleteMany({ where: { userId: USER } });
    await addAssignment("2026-10-28T03:59:00Z"); // Tuesday only

    const { calls } = await tick(EIGHT_AM);

    expect(calls).toHaveLength(0);
    expect(await lastSent()).toBeNull();
  });

  it("sends nothing while reminders are disabled, and keeps the device registrations", async () => {
    await prisma.user.update({ where: { id: USER }, data: { remindersEnabled: false } });

    const { calls } = await tick(EIGHT_AM);

    expect(calls).toHaveLength(0);
    expect(await prisma.pushSubscription.count({ where: { userId: USER } })).toBe(2);
  });

  it("evaluates each user in their own timezone", async () => {
    await prisma.user.update({ where: { id: USER }, data: { timezone: "UTC", reminderTime: "12:00" } });
    await addAssignment("2026-10-26T20:00:00Z"); // Monday in UTC too
    // At 11:59Z it is still before 12:00 UTC (the New York assignment, due 03:59Z Tuesday,
    // is not due Monday in UTC, so the count there is 1).
    const before = await tick(new Date("2026-10-26T11:59:00Z"));
    expect(before.calls).toHaveLength(0);
    const after = await tick(new Date("2026-10-26T12:00:00Z"));
    expect(after.calls[0].body.body).toBe("1 assignment due today");
  });

  it("does not record a day when the user has no device, so a device enabled later still gets it", async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId: USER } });
    const none = await tick(EIGHT_AM);
    expect(none.calls).toHaveLength(0);
    expect(await lastSent()).toBeNull();

    await addDevice(ENDPOINT_A);
    const later = await tick(NOON);
    expect(later.calls.map((c) => c.endpoint)).toEqual([ENDPOINT_A]);
    expect(await lastSent()).toBe("2026-10-26");
  });

  it("records the day and deletes the device when the push service says it is gone", async () => {
    const { calls } = await tick(EIGHT_AM, { [ENDPOINT_A]: 410, [ENDPOINT_B]: 404 });

    expect(calls).toHaveLength(0);
    expect(await prisma.pushSubscription.count({ where: { userId: USER } })).toBe(0);
    expect(await lastSent()).toBe("2026-10-26");
  });

  it("retries every 15 minutes after every send fails, then records the day on success", async () => {
    const outage = { [ENDPOINT_A]: 500, [ENDPOINT_B]: 503 };
    const later = (minutes: number) => new Date(EIGHT_AM.getTime() + minutes * 60 * 1000);

    await tick(EIGHT_AM, outage);
    expect(await lastSent()).toBeNull();

    // Inside the retry delay nothing is attempted, even though the service is back.
    expect((await tick(later(10))).calls).toHaveLength(0);

    // Still down at 15 minutes: another failure, another wait.
    await tick(later(15), outage);
    expect((await tick(later(20))).calls).toHaveLength(0);

    const retry = await tick(later(30));
    expect(retry.calls).toHaveLength(2);
    expect(await lastSent()).toBe("2026-10-26");
    expect((await tick(later(60))).calls).toHaveLength(0);
    // Failed (not gone) devices stayed registered throughout.
    expect(await prisma.pushSubscription.count({ where: { userId: USER } })).toBe(2);
  });

  it("stops retrying at local midnight and starts fresh the next day", async () => {
    await tick(EIGHT_AM, { [ENDPOINT_A]: 500, [ENDPOINT_B]: 503 });
    expect(await lastSent()).toBeNull();

    // Next local day, 08:00 EDT: nothing due today any more, so nothing is sent.
    const nextDay = new Date("2026-10-27T12:00:00Z");
    expect((await tick(nextDay)).calls).toHaveLength(0);
  });

  it("does not resend to the devices that got it when another device fails", async () => {
    const first = await tick(EIGHT_AM, { [ENDPOINT_B]: 500 });
    expect(first.calls.map((c) => c.endpoint)).toEqual([ENDPOINT_A]);

    const again = await tick(NOON);
    expect(again.calls).toHaveLength(0);
  });

  it("does not record the day when pushes cannot be sent at all (not configured)", async () => {
    // No injected sender and no VAPID keys in the environment the tick reads.
    const result = await runReminderTick({
      deps: { now: () => EIGHT_AM, env: {} },
    });

    expect(result.errors).toBeGreaterThanOrEqual(1);
    expect(await lastSent()).toBeNull();
  });

  it("ignores users who have reminders on but no Assignments or devices", async () => {
    await prisma.user.update({ where: { id: OTHER }, data: { remindersEnabled: true } });

    const { calls } = await tick(EIGHT_AM);

    expect(calls).toHaveLength(2); // only USER's devices
    expect(await prisma.reminderState.findUnique({ where: { userId: OTHER } })).toBeNull();
  });
});
