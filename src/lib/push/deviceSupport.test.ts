import { describe, expect, it } from "vitest";

import {
  describeDeviceSupport,
  describeSubscribeError,
  describeTestPushResult,
  type DeviceFacts,
} from "./deviceSupport";

const capable: DeviceFacts = {
  serverConfigured: true,
  isSecureContext: true,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isIos: false,
  isStandalone: false,
  permission: "default",
  subscribed: false,
};

const facts = (overrides: Partial<DeviceFacts>): DeviceFacts => ({ ...capable, ...overrides });

describe("describeDeviceSupport", () => {
  it("lets a capable device enable reminders", () => {
    expect(describeDeviceSupport(capable)).toEqual({ status: "can-enable" });
  });

  it("allows a desktop browser tab (installing is only required on iPhone and iPad)", () => {
    expect(describeDeviceSupport(facts({ isStandalone: false, isIos: false })).status).toBe("can-enable");
  });

  it("shows enabled once this device is subscribed", () => {
    expect(describeDeviceSupport(facts({ subscribed: true, permission: "granted" })).status).toBe("enabled");
  });

  it("explains that the server has no push keys", () => {
    const state = describeDeviceSupport(facts({ serverConfigured: false }));
    expect(state.status).toBe("server-not-configured");
    expect(state).toMatchObject({ message: expect.stringMatching(/server/i) });
  });

  it("tells an iPhone browser tab to install the app first, even though it lacks push APIs", () => {
    const state = describeDeviceSupport(
      facts({ isIos: true, isStandalone: false, hasPushManager: false, hasNotification: false }),
    );
    expect(state.status).toBe("not-installed");
    expect(state).toMatchObject({ message: expect.stringMatching(/Add to Home Screen/) });
  });

  it("works on an iPhone once installed", () => {
    expect(describeDeviceSupport(facts({ isIos: true, isStandalone: true })).status).toBe("can-enable");
  });

  it("explains when this browser has no push support at all", () => {
    for (const missing of ["hasServiceWorker", "hasPushManager", "hasNotification"] as const) {
      expect(describeDeviceSupport(facts({ [missing]: false })).status).toBe("unsupported");
    }
  });

  it("explains that push needs the secure HTTPS address", () => {
    const state = describeDeviceSupport(facts({ isSecureContext: false, hasServiceWorker: false }));
    expect(state.status).toBe("insecure");
    expect(state).toMatchObject({ message: expect.stringMatching(/HTTPS/) });
  });

  it("explains how to fix a denied permission, and never offers the button", () => {
    const state = describeDeviceSupport(facts({ permission: "denied" }));
    expect(state.status).toBe("denied");
    expect(state).toMatchObject({ message: expect.stringMatching(/blocked/i) });
  });

  it("a denied permission wins over a stale subscription", () => {
    expect(describeDeviceSupport(facts({ permission: "denied", subscribed: true })).status).toBe("denied");
  });
});

describe("describeTestPushResult", () => {
  it("confirms a delivered test push", () => {
    expect(describeTestPushResult({ sent: 1, removed: 0, failed: 0 })).toEqual({
      ok: true,
      text: "Test push sent. It should arrive on this device in a moment.",
    });
  });

  it("says when the server isn't set up for push", () => {
    const result = describeTestPushResult({ sent: 0, removed: 0, failed: 0, error: "VAPID_PUBLIC_KEY missing" });
    expect(result).toEqual({ ok: false, text: "VAPID_PUBLIC_KEY missing" });
  });

  it("tells the student to re-enable when the device's subscription was gone", () => {
    const result = describeTestPushResult({ sent: 0, removed: 1, failed: 0 });
    expect(result.ok).toBe(false);
    expect(result.text).toMatch(/enable reminders on this device again/i);
  });

  it("reports a failed delivery", () => {
    const result = describeTestPushResult({ sent: 0, removed: 0, failed: 1 });
    expect(result.ok).toBe(false);
    expect(result.text).toMatch(/push service/i);
  });

  it("reports a device the server doesn't know", () => {
    const result = describeTestPushResult({ sent: 0, removed: 0, failed: 0 });
    expect(result.ok).toBe(false);
    expect(result.text).toMatch(/enable reminders on this device/i);
  });
});

describe("describeSubscribeError", () => {
  it("points Brave users at the Google services push setting when the push service errors", () => {
    const error = Object.assign(new Error("Registration failed - push service error"), {
      name: "AbortError",
    });
    expect(describeSubscribeError(error)).toMatch(/Google services for push messaging/);
  });

  it("treats a refused permission as denied", () => {
    const error = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
    expect(describeSubscribeError(error)).toMatch(/blocked/i);
  });

  it("falls back to a generic message", () => {
    expect(describeSubscribeError(new Error("boom"))).toMatch(/couldn't turn on reminders/i);
    expect(describeSubscribeError("weird")).toMatch(/couldn't turn on reminders/i);
  });
});
