import { describe, expect, it } from "vitest";

import { mailAutoSyncDue } from "./autoSyncGuard";

const now = new Date("2026-10-26T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const ago = (ms: number) => new Date(now.getTime() - ms);

const idle = { lastSuccessAt: null, lastAttemptAt: null, needsReconnect: false, now };

describe("mailAutoSyncDue", () => {
  it("is due when there has never been a sync", () => {
    expect(mailAutoSyncDue(idle)).toBe(true);
  });

  it("is not due 23 hours 59 minutes after the last successful sync", () => {
    const lastSuccessAt = ago(24 * HOUR_MS - MINUTE_MS);
    expect(mailAutoSyncDue({ ...idle, lastSuccessAt, lastAttemptAt: lastSuccessAt })).toBe(false);
  });

  it("is due exactly 24 hours after the last successful sync", () => {
    const lastSuccessAt = ago(24 * HOUR_MS);
    expect(mailAutoSyncDue({ ...idle, lastSuccessAt, lastAttemptAt: lastSuccessAt })).toBe(true);
  });

  it("is due long after the last successful sync", () => {
    const lastSuccessAt = ago(5 * 24 * HOUR_MS);
    expect(mailAutoSyncDue({ ...idle, lastSuccessAt, lastAttemptAt: lastSuccessAt })).toBe(true);
  });

  it("is never due while the student needs to reconnect Microsoft", () => {
    expect(mailAutoSyncDue({ ...idle, needsReconnect: true })).toBe(false);
    const lastSuccessAt = ago(5 * 24 * HOUR_MS);
    expect(mailAutoSyncDue({ ...idle, lastSuccessAt, needsReconnect: true })).toBe(false);
  });

  it("does not retry a failed sync until the next 24-hour window", () => {
    const lastSuccessAt = ago(30 * HOUR_MS);
    const failedAttempt = ago(HOUR_MS);
    expect(mailAutoSyncDue({ ...idle, lastSuccessAt, lastAttemptAt: failedAttempt })).toBe(false);
  });

  it("does not retry a first-ever sync that failed until 24 hours after the attempt", () => {
    expect(mailAutoSyncDue({ ...idle, lastAttemptAt: ago(23 * HOUR_MS) })).toBe(false);
    expect(mailAutoSyncDue({ ...idle, lastAttemptAt: ago(24 * HOUR_MS) })).toBe(true);
  });

  it("is not due when the stored times are in the future (clock moved backwards)", () => {
    const future = new Date(now.getTime() + HOUR_MS);
    expect(mailAutoSyncDue({ ...idle, lastSuccessAt: future, lastAttemptAt: future })).toBe(false);
  });
});
