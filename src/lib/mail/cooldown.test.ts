import { describe, expect, it } from "vitest";

import { manualSyncCooldown } from "./cooldown";

const now = new Date("2026-10-26T12:00:00.000Z");
const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000);

describe("manualSyncCooldown", () => {
  it("allows a sync when there has never been an attempt", () => {
    expect(manualSyncCooldown({ lastAttemptAt: null, now })).toEqual({ allowed: true });
  });

  it("refuses a sync 59 seconds after the last attempt and says how long to wait", () => {
    expect(manualSyncCooldown({ lastAttemptAt: secondsAgo(59), now })).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it("allows a sync exactly 60 seconds after the last attempt", () => {
    expect(manualSyncCooldown({ lastAttemptAt: secondsAgo(60), now })).toEqual({ allowed: true });
  });

  it("rounds a partial second of remaining wait up", () => {
    const lastAttemptAt = new Date(now.getTime() - 10_500);
    expect(manualSyncCooldown({ lastAttemptAt, now })).toEqual({
      allowed: false,
      retryAfterSeconds: 50,
    });
  });

  it("refuses an immediate repeat", () => {
    expect(manualSyncCooldown({ lastAttemptAt: now, now })).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });
});
