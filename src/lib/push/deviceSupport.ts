import type { SendResult } from "./send";

/**
 * Whether this device can receive Reminders, and the plain-language reason when it can't
 * (Settings, "Enable reminders on this device"). Pure: the client component gathers the facts
 * from the browser and this decides what to show.
 */
export interface DeviceFacts {
  /** The server has VAPID keys configured. */
  serverConfigured: boolean;
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIos: boolean;
  /** Running as an installed app (display-mode standalone / iOS navigator.standalone). */
  isStandalone: boolean;
  permission: "default" | "granted" | "denied";
  /** This browser already holds a push subscription. */
  subscribed: boolean;
}

export type DeviceSupport =
  | { status: "can-enable" }
  | { status: "enabled" }
  | {
      status:
        | "insecure"
        | "not-installed"
        | "unsupported"
        | "denied"
        | "server-not-configured";
      message: string;
    };

export function describeDeviceSupport(facts: DeviceFacts): DeviceSupport {
  if (!facts.isSecureContext) {
    return {
      status: "insecure",
      message:
        "Reminders need the secure HTTPS address of StudyDesk (the tailnet address), not plain http.",
    };
  }
  // iPhone and iPad only expose push to an installed Home Screen app, so a Safari tab lacks the
  // APIs entirely; check this before "unsupported" so the fix we suggest is the right one.
  if (facts.isIos && !facts.isStandalone) {
    return {
      status: "not-installed",
      message:
        "On iPhone and iPad, reminders only work from the installed app. In Safari tap Share, then Add to Home Screen, then open StudyDesk from the Home Screen and come back here.",
    };
  }
  if (!facts.hasServiceWorker || !facts.hasPushManager || !facts.hasNotification) {
    return {
      status: "unsupported",
      message:
        "This browser can't receive push notifications. Use the installed app on iPhone (iOS 16.4 or later), or Edge, Chrome or Brave on a computer.",
    };
  }
  if (facts.permission === "denied") {
    return {
      status: "denied",
      message:
        "Notifications are blocked for StudyDesk on this device. Allow them in the device's settings (iPhone: Settings, Notifications, StudyDesk; computer: the site settings next to the address bar), then reload this page.",
    };
  }
  if (!facts.serverConfigured) {
    return {
      status: "server-not-configured",
      message:
        "Push isn't set up on the server yet: it needs VAPID keys. See docs/deployment/push-notifications.md.",
    };
  }
  return facts.subscribed ? { status: "enabled" } : { status: "can-enable" };
}

/** The Settings message after "Send test push" for the current device. */
export function describeTestPushResult(result: SendResult): { ok: boolean; text: string } {
  if (result.error) return { ok: false, text: result.error };
  if (result.sent > 0) {
    return { ok: true, text: "Test push sent. It should arrive on this device in a moment." };
  }
  if (result.removed > 0) {
    return {
      ok: false,
      text: "This device's subscription had expired, so it was removed. Enable reminders on this device again.",
    };
  }
  if (result.failed > 0) {
    return { ok: false, text: "The push service didn't accept the test push. Try again in a moment." };
  }
  return {
    ok: false,
    text: "This device isn't registered yet. Enable reminders on this device first.",
  };
}

/** A friendly message for a failed `pushManager.subscribe()` / permission request. */
export function describeSubscribeError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") {
    return "Notifications are blocked for StudyDesk on this device. Allow them in the device's settings, then try again.";
  }
  if (name === "AbortError") {
    return "The browser couldn't reach its push service. In Brave, turn on Settings, Privacy and security, Use Google services for push messaging, then restart Brave and try again.";
  }
  return "Couldn't turn on reminders on this device. Try again.";
}
