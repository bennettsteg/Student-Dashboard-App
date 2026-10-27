import { describe, expect, it } from "vitest";

import { searchDashboard } from "./search";

const courses = [
  { id: "c1", name: "Web Applications", code: "CS 301" },
  { id: "c2", name: "Networking Fundamentals", code: null },
  { id: "c3", name: "Database Systems", code: "CS 340" },
];

const assignments = [
  { id: "a1", title: "Responsive layout lab", courseId: "c1" },
  { id: "a2", title: "Subnetting worksheet", courseId: "c2" },
  { id: "a3", title: "Database design project", courseId: "c3" },
  { id: "a4", title: "Web app prototype", courseId: "c1" },
];

describe("searchDashboard", () => {
  it("finds nothing for a blank query", () => {
    expect(searchDashboard("", assignments, courses)).toEqual([]);
    expect(searchDashboard("   ", assignments, courses)).toEqual([]);
  });

  it("finds Assignments by title and Courses by name, ignoring case", () => {
    const results = searchDashboard("RESPONSIVE", assignments, courses);
    expect(results).toEqual([
      {
        kind: "assignment",
        id: "a1",
        title: "Responsive layout lab",
        subtitle: "Assignment · Web Applications",
        href: "/assignments?course=c1&assignment=a1",
      },
    ]);
  });

  it("navigates a Course result to its detail page", () => {
    const results = searchDashboard("network", assignments, courses);
    expect(results).toEqual([
      {
        kind: "course",
        id: "c2",
        title: "Networking Fundamentals",
        subtitle: "Course",
        href: "/courses/c2",
      },
    ]);
  });

  it("matches a Course by its code too", () => {
    const results = searchDashboard("cs 340", assignments, courses);
    expect(results.map((r) => r.id)).toEqual(["c3"]);
  });

  it("matches anywhere in the name and returns both kinds, Courses first", () => {
    const results = searchDashboard("database", assignments, courses);
    expect(results.map((r) => [r.kind, r.id])).toEqual([
      ["course", "c3"],
      ["assignment", "a3"],
    ]);
  });

  it("lists names that start with the query ahead of names that merely contain it", () => {
    const results = searchDashboard("web", assignments, courses);
    // "Web Applications" and "Web app prototype" start with it; nothing else contains it here.
    expect(results.map((r) => r.id)).toEqual(["c1", "a4"]);

    const more = searchDashboard(
      "lab",
      [
        { id: "x1", title: "Chemistry lab", courseId: "c1" },
        { id: "x2", title: "Lab report", courseId: "c1" },
      ],
      [],
    );
    expect(more.map((r) => r.id)).toEqual(["x2", "x1"]);
  });

  it("caps the number of results", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      title: `Reading ${i}`,
      courseId: "c1",
    }));
    expect(searchDashboard("reading", many, courses, 5)).toHaveLength(5);
  });

  it("labels an Assignment with no known Course on its own", () => {
    const results = searchDashboard("orphan", [{ id: "o", title: "Orphan task", courseId: "gone" }], courses);
    expect(results[0].subtitle).toBe("Assignment");
    expect(results[0].href).toBe("/assignments?course=gone&assignment=o");
  });
});
