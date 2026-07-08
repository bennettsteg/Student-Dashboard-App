import ical from "node-ical";
import { describe, expect, it } from "vitest";

import { parseIcsFeed } from "./parse";

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

const now = new Date();
const window = {
  from: new Date(now.getTime() - 30 * 24 * 3600 * 1000),
  to: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
};

function buildIcs(events: string[]): string {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//Test//EN\r\n${events.join("")}END:VCALENDAR\r\n`;
}

describe("parseIcsFeed", () => {
  it("splits a Blackboard-style 'Course: Title' summary into courseName and title", () => {
    const start = new Date(now.getTime() + 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    const ics = buildIcs([
      `BEGIN:VEVENT\r\nUID:e1@test\r\nDTSTAMP:${fmt(now)}\r\nDTSTART:${fmt(start)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:CS 201: Homework 1 due\r\nEND:VEVENT\r\n`,
    ]);

    const [event] = parseIcsFeed(ical.sync.parseICS(ics), window);

    expect(event.courseName).toBe("CS 201");
    expect(event.title).toBe("Homework 1 due");
    expect(event.isAssignment).toBe(true);
    expect(event.dueAt).not.toBeNull();
  });

  it("leaves courseName null and keeps the full title when there is no colon prefix", () => {
    const start = new Date(now.getTime() + 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    const ics = buildIcs([
      `BEGIN:VEVENT\r\nUID:e2@test\r\nDTSTAMP:${fmt(now)}\r\nDTSTART:${fmt(start)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:Study group\r\nEND:VEVENT\r\n`,
    ]);

    const [event] = parseIcsFeed(ical.sync.parseICS(ics), window);

    expect(event.courseName).toBeNull();
    expect(event.title).toBe("Study group");
    expect(event.isAssignment).toBe(false);
    expect(event.dueAt).toBeNull();
  });

  it("excludes cancelled events", () => {
    const start = new Date(now.getTime() + 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    const ics = buildIcs([
      `BEGIN:VEVENT\r\nUID:e3@test\r\nDTSTAMP:${fmt(now)}\r\nDTSTART:${fmt(start)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:CS 201: Cancelled class\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\n`,
    ]);

    const events = parseIcsFeed(ical.sync.parseICS(ics), window);

    expect(events).toHaveLength(0);
  });

  it("expands a weekly recurring event into one instance per occurrence within the window", () => {
    const start = new Date(now.getTime() + 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    const shortWindow = { from: now, to: new Date(now.getTime() + 21 * 24 * 3600 * 1000) };
    const ics = buildIcs([
      `BEGIN:VEVENT\r\nUID:e4@test\r\nDTSTAMP:${fmt(now)}\r\nDTSTART:${fmt(start)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:CS 201: Weekly lecture\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEND:VEVENT\r\n`,
    ]);

    const events = parseIcsFeed(ical.sync.parseICS(ics), shortWindow);

    expect(events).toHaveLength(3);
    expect(new Set(events.map((e) => e.recurrenceId)).size).toBe(3);
    expect(events.every((e) => e.uid === "e4@test")).toBe(true);
  });
});
