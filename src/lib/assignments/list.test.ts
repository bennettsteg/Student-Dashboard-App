import { describe, expect, it } from "vitest";

import { DEFAULT_DUE_TIME, visibleAssignments } from "./list";

const row = (title: string, courseId: string, dueAt: string) => ({ title, courseId, dueAt });

describe("visibleAssignments", () => {
  const rows = [
    row("Quiz", "web", "2026-10-30T12:00:00Z"),
    row("Lab", "web", "2026-10-27T12:00:00Z"),
    row("Worksheet", "net", "2026-10-27T12:00:00Z"),
    row("Project", "db", "2026-10-29T12:00:00Z"),
  ];

  it("sorts by due date, soonest first, breaking ties by title", () => {
    expect(visibleAssignments(rows, null).map((r) => r.title)).toEqual([
      "Lab",
      "Worksheet",
      "Project",
      "Quiz",
    ]);
  });

  it("shows only the chosen Course's Assignments when filtered", () => {
    expect(visibleAssignments(rows, "web").map((r) => r.title)).toEqual(["Lab", "Quiz"]);
  });

  it("returns nothing for a Course with no open Assignments", () => {
    expect(visibleAssignments(rows, "other")).toEqual([]);
  });

  it("does not reorder the input", () => {
    const copy = [...rows];
    visibleAssignments(rows, null);
    expect(rows).toEqual(copy);
  });
});

describe("DEFAULT_DUE_TIME", () => {
  it("is 11:59 PM as an HH:mm value", () => {
    expect(DEFAULT_DUE_TIME).toBe("23:59");
  });
});
