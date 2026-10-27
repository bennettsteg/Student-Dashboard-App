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
