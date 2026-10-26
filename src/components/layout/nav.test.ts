import { describe, expect, it } from "vitest";

import { MORE_SECTIONS, NAV_SECTIONS, PHONE_TABS, isMoreActive, isNavActive } from "./nav";

describe("nav sections", () => {
  it("lists the eight sections in the agreed sidebar order", () => {
    expect(NAV_SECTIONS.map((s) => [s.label, s.href])).toEqual([
      ["Dashboard", "/"],
      ["Assignments", "/assignments"],
      ["Courses", "/courses"],
      ["Schedule", "/schedule"],
      ["Calendar", "/calendar"],
      ["Notifications", "/notifications"],
      ["Links", "/links"],
      ["Settings", "/settings"],
    ]);
  });

  it("puts four sections in the phone tab bar and the rest behind More", () => {
    expect(PHONE_TABS.map((s) => s.label)).toEqual([
      "Dashboard",
      "Assignments",
      "Courses",
      "Notifications",
    ]);
    expect(MORE_SECTIONS.map((s) => s.label)).toEqual(["Schedule", "Calendar", "Links", "Settings"]);
  });

  it("highlights More when the current page is one of its sections", () => {
    expect(isMoreActive("/links")).toBe(true);
    expect(isMoreActive("/settings")).toBe(true);
    expect(isMoreActive("/notifications")).toBe(false);
    expect(isMoreActive("/")).toBe(false);
  });
});

describe("isNavActive", () => {
  it("marks Dashboard active only on the root path", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/assignments", "/")).toBe(false);
  });

  it("marks a section active on its own path and on nested paths", () => {
    expect(isNavActive("/assignments", "/assignments")).toBe(true);
    expect(isNavActive("/assignments/abc123", "/assignments")).toBe(true);
  });

  it("does not mark a section active for a path that merely shares a prefix", () => {
    expect(isNavActive("/coursesfoo", "/courses")).toBe(false);
    expect(isNavActive("/calendar", "/courses")).toBe(false);
  });
});
