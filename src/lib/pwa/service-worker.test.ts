import path from "node:path";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

// public/sw.js is a plain classic script (it can't import modules), so its pure routing
// helpers are exported through a guarded `module.exports` for these tests.
const require = createRequire(import.meta.url);
const sw = require(path.resolve(__dirname, "../../../public/sw.js")) as {
  shouldHandleFetch(req: { method: string; mode: string }): boolean;
  shouldServeOfflineFallback(outcome: { networkError: boolean; status?: number }): boolean;
  staleCacheNames(keys: string[], current: string): string[];
  parsePushPayload(text: string | null | undefined): { title: string; body: string; url: string };
  buildNotification(payload: { title: string; body: string; url: string }): {
    title: string;
    options: { body: string; icon: string; badge: string; tag: string; data: { url: string } };
  };
  planNotificationClick(
    clientUrls: string[],
    targetPath: string,
    origin: string,
  ): { action: "focus"; index: number; navigate: boolean } | { action: "open"; url: string };
  OFFLINE_URL: string;
  OFFLINE_CACHE: string;
};

describe("service worker fetch routing", () => {
  it("only intercepts page navigations (GET), so no data is ever cached or queued", () => {
    expect(sw.shouldHandleFetch({ method: "GET", mode: "navigate" })).toBe(true);
    expect(sw.shouldHandleFetch({ method: "POST", mode: "navigate" })).toBe(false);
    expect(sw.shouldHandleFetch({ method: "GET", mode: "cors" })).toBe(false);
    expect(sw.shouldHandleFetch({ method: "GET", mode: "same-origin" })).toBe(false);
    expect(sw.shouldHandleFetch({ method: "GET", mode: "no-cors" })).toBe(false);
  });
});

describe("offline fallback decision", () => {
  it("shows the offline page when the network request fails outright", () => {
    expect(sw.shouldServeOfflineFallback({ networkError: true })).toBe(true);
  });

  it("shows the offline page when the proxy cannot reach the app (502/503/504)", () => {
    for (const status of [502, 503, 504]) {
      expect(sw.shouldServeOfflineFallback({ networkError: false, status })).toBe(true);
    }
  });

  it("passes every other response through untouched", () => {
    for (const status of [200, 301, 304, 401, 404, 500]) {
      expect(sw.shouldServeOfflineFallback({ networkError: false, status })).toBe(false);
    }
  });
});

describe("cache housekeeping", () => {
  it("deletes only older StudyDesk offline caches, never the current one or foreign caches", () => {
    expect(
      sw.staleCacheNames(
        ["studydesk-offline-v0", sw.OFFLINE_CACHE, "someone-elses-cache"],
        sw.OFFLINE_CACHE,
      ),
    ).toEqual(["studydesk-offline-v0"]);
  });

  it("points at a self-contained static offline page", () => {
    expect(sw.OFFLINE_URL).toBe("/offline.html");
  });
});

describe("push payload handling", () => {
  it("reads the generic count-only payload the server sends", () => {
    expect(
      sw.parsePushPayload(
        JSON.stringify({ title: "StudyDesk", body: "2 assignments due today", url: "/assignments" }),
      ),
    ).toEqual({ title: "StudyDesk", body: "2 assignments due today", url: "/assignments" });
  });

  it("still yields something to show for an empty or malformed push (iOS requires a visible notification)", () => {
    const fallback = { title: "StudyDesk", body: "You have assignments due today.", url: "/assignments" };
    expect(sw.parsePushPayload(null)).toEqual(fallback);
    expect(sw.parsePushPayload("")).toEqual(fallback);
    expect(sw.parsePushPayload("not json")).toEqual(fallback);
    expect(sw.parsePushPayload("42")).toEqual(fallback);
  });

  it("only ever opens a same-origin path, falling back to Assignments", () => {
    for (const url of ["https://evil.example/phish", "//evil.example", "javascript:alert(1)", 5, ""]) {
      expect(sw.parsePushPayload(JSON.stringify({ title: "t", body: "b", url })).url).toBe(
        "/assignments",
      );
    }
    expect(sw.parsePushPayload(JSON.stringify({ title: "t", body: "b", url: "/courses" })).url).toBe(
      "/courses",
    );
  });

  it("builds a notification that remembers where a tap should go", () => {
    expect(
      sw.buildNotification({ title: "StudyDesk", body: "1 assignment due today", url: "/assignments" }),
    ).toEqual({
      title: "StudyDesk",
      options: {
        body: "1 assignment due today",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "studydesk-reminder",
        data: { url: "/assignments" },
      },
    });
  });
});

describe("tapping a notification", () => {
  const origin = "https://host.tail1234.ts.net";

  it("opens Assignments in a new window when the app isn't open", () => {
    expect(sw.planNotificationClick([], "/assignments", origin)).toEqual({
      action: "open",
      url: `${origin}/assignments`,
    });
  });

  it("brings the open app forward and navigates it to Assignments", () => {
    expect(sw.planNotificationClick([`${origin}/courses`], "/assignments", origin)).toEqual({
      action: "focus",
      index: 0,
      navigate: true,
    });
  });

  it("prefers a window that is already on Assignments and leaves it where it is", () => {
    expect(
      sw.planNotificationClick(
        [`${origin}/courses`, `${origin}/assignments?course=abc`],
        "/assignments",
        origin,
      ),
    ).toEqual({ action: "focus", index: 1, navigate: false });
  });

  it("ignores windows from other origins", () => {
    expect(
      sw.planNotificationClick(["https://other.example/assignments"], "/assignments", origin),
    ).toEqual({ action: "open", url: `${origin}/assignments` });
  });
});
