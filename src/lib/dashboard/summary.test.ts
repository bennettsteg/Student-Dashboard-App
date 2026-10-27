import { describe, expect, it } from "vitest";

import { summaryStats } from "./summary";

const UTC = "UTC";
const NY = "America/New_York";

// Monday 2026-10-26 noon UTC.
const NOW = new Date("2026-10-26T12:00:00Z");

const a = (courseId: string, dueAt: string) => ({ courseId, dueAt: new Date(dueAt) });

describe("summaryStats", () => {
  it("is all zeros and no next due date with no Assignments", () => {
    expect(summaryStats([], NOW, UTC)).toEqual({
      dueThisWeek: 0,
      nextDueAt: null,
      openCount: 0,
      courseCount: 0,
    });
  });

  it("counts Assignments due on a local day of the current Monday-Sunday week", () => {
    const stats = summaryStats(
      [
        a("c1", "2026-10-27T23:59:00Z"), // Tue
        a("c1", "2026-11-01T23:59:00Z"), // Sun, last day of this week
        a("c2", "2026-11-02T00:01:00Z"), // next Monday: not this week
      ],
      NOW,
      UTC,
    );
    expect(stats.dueThisWeek).toBe(2);
  });

  it("counts work due earlier this week and already past due", () => {
    const stats = summaryStats([a("c1", "2026-10-26T08:00:00Z")], NOW, UTC);
    expect(stats.dueThisWeek).toBe(1);
  });

  it("does not count work from before this week", () => {
    const stats = summaryStats([a("c1", "2026-10-25T23:59:00Z")], NOW, UTC);
    expect(stats.dueThisWeek).toBe(0);
    expect(stats.openCount).toBe(1);
  });

  it("decides the week in the given timezone, not UTC", () => {
    // 2026-11-02T02:00Z is still Sunday Nov 1 in New York.
    const dueAt = "2026-11-02T02:00:00Z";
    expect(summaryStats([a("c1", dueAt)], NOW, NY).dueThisWeek).toBe(1);
    expect(summaryStats([a("c1", dueAt)], NOW, UTC).dueThisWeek).toBe(0);
  });

  it("next due is the soonest Assignment not yet past due", () => {
    const stats = summaryStats(
      [
        a("c1", "2026-10-26T08:00:00Z"), // overdue
        a("c2", "2026-10-29T23:59:00Z"),
        a("c1", "2026-10-27T23:59:00Z"),
      ],
      NOW,
      UTC,
    );
    expect(stats.nextDueAt).toEqual(new Date("2026-10-27T23:59:00Z"));
  });

  it("next due is null when everything is overdue", () => {
    expect(summaryStats([a("c1", "2026-10-20T08:00:00Z")], NOW, UTC).nextDueAt).toBeNull();
  });

  it("an Assignment due exactly now is still next due", () => {
    expect(summaryStats([a("c1", "2026-10-26T12:00:00Z")], NOW, UTC).nextDueAt).toEqual(NOW);
  });

  it("counts open Assignments and the distinct Courses they span", () => {
    const stats = summaryStats(
      [
        a("c1", "2026-10-27T23:59:00Z"),
        a("c1", "2026-12-01T23:59:00Z"),
        a("c2", "2026-10-20T23:59:00Z"),
      ],
      NOW,
      UTC,
    );
    expect(stats.openCount).toBe(3);
    expect(stats.courseCount).toBe(2);
  });
});
