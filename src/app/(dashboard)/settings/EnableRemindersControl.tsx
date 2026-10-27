"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  describeDeviceSupport,
  describeSubscribeError,
  type DeviceFacts,
} from "@/lib/push/deviceSupport";
import { disableDevicePush, enableDevicePush, sendTestPush } from "@/server-actions/push-actions";

interface EnableRemindersControlProps {
  /** The server's VAPID public key, or null when push isn't configured. */
  publicKey: string | null;
  /** Endpoints the server has registered, to tell whether *this* browser's subscription is known. */
  registeredEndpoints: string[];
}

type Message = { text: string; isError: boolean };

/** RFC 8292 keys are base64url; `applicationServerKey` wants the raw bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Waits for the service worker, but never forever (it isn't registered in `next dev`). */
async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function readFacts(
  publicKey: string | null,
  registeredEndpoints: string[],
): Promise<DeviceFacts> {
  const hasServiceWorker = "serviceWorker" in navigator;
  const hasPushManager = "PushManager" in window;
  const hasNotification = "Notification" in window;

  let subscribed = false;
  if (hasServiceWorker && hasPushManager) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    subscribed = !!subscription && registeredEndpoints.includes(subscription.endpoint);
  }

  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return {
    serverConfigured: publicKey !== null,
    isSecureContext: window.isSecureContext,
    hasServiceWorker,
    hasPushManager,
    hasNotification,
    isIos,
    isStandalone,
    permission: hasNotification ? Notification.permission : "default",
    subscribed,
  };
}

/**
 * "Enable reminders on this device": asks for notification permission from a click (required
 * on iOS, and only possible inside the installed app there), subscribes this browser to push
 * and stores the subscription. Explains plainly when this device can't receive pushes.
 */
export function EnableRemindersControl({
  publicKey,
  registeredEndpoints,
}: EnableRemindersControlProps) {
  const [facts, setFacts] = useState<DeviceFacts | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function refresh() {
    setFacts(await readFacts(publicKey, registeredEndpoints));
  }

  useEffect(() => {
    let cancelled = false;
    readFacts(publicKey, registeredEndpoints).then((next) => {
      if (!cancelled) setFacts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [publicKey, registeredEndpoints]);

  async function handleEnable() {
    if (!publicKey) return;
    setBusy(true);
    setMessage(null);
    try {
      // First, synchronously inside the click: iOS only shows the permission prompt for a gesture.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage({
          text:
            permission === "denied"
              ? describeSubscribeError(Object.assign(new Error(), { name: "NotAllowedError" }))
              : "Permission wasn't granted. Press the button again and choose Allow.",
          isError: true,
        });
        return;
      }

      const registration = await activeRegistration();
      if (!registration) {
        setMessage({
          text: "StudyDesk's background service isn't running, so reminders can't be set up. It only runs in the installed or production build. Reload and try again.",
          isError: true,
        });
        return;
      }

      const options = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      };
      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe(options);
      } catch (error) {
        // A subscription made with a different VAPID key blocks a new one: replace it.
        if (error instanceof Error && error.name === "InvalidStateError") {
          await (await registration.pushManager.getSubscription())?.unsubscribe();
          subscription = await registration.pushManager.subscribe(options);
        } else {
          throw error;
        }
      }

      const json = subscription.toJSON();
      const result = await enableDevicePush({
        endpoint: json.endpoint ?? subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      });
      setMessage(
        result.ok
          ? { text: "Reminders are on for this device.", isError: false }
          : { text: result.error, isError: true },
      );
    } catch (error) {
      setMessage({ text: describeSubscribeError(error), isError: true });
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function currentSubscription() {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.pushManager.getSubscription() ?? null;
  }

  async function handleDisable() {
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await disableDevicePush(endpoint);
      }
      setMessage({ text: "Reminders are off for this device.", isError: false });
    } catch {
      setMessage({ text: "Couldn't turn off reminders on this device. Try again.", isError: true });
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await currentSubscription();
      if (!subscription) {
        setMessage({ text: "Enable reminders on this device first.", isError: true });
        return;
      }
      const result = await sendTestPush(subscription.endpoint);
      setMessage({ text: result.text, isError: !result.ok });
    } catch {
      setMessage({ text: "Couldn't send the test push. Try again.", isError: true });
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  if (!facts) {
    return <p className="text-sm text-muted-foreground">Checking this device…</p>;
  }

  const support = describeDeviceSupport(facts);

  return (
    <div className="space-y-3">
      {support.status === "can-enable" && (
        <Button type="button" onClick={handleEnable} disabled={busy}>
          {busy ? "Enabling…" : "Enable reminders on this device"}
        </Button>
      )}
      {support.status === "enabled" && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            Reminders are enabled on this device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleTest} disabled={busy}>
              Send test push
            </Button>
            <Button type="button" variant="outline" onClick={handleDisable} disabled={busy}>
              Turn off on this device
            </Button>
          </div>
        </div>
      )}
      {"message" in support && (
        <p className="rounded-lg border border-border bg-surface-sunken px-4 py-3 text-sm">
          {support.message}
        </p>
      )}
      {message && (
        <p className={`text-sm ${message.isError ? "text-destructive" : "text-muted-foreground"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
