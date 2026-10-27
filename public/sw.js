/*
 * StudyDesk service worker.
 *
 * Scope is deliberately tiny: the app is online-only. This worker caches exactly one thing
 * (the static offline page) and uses it when a page navigation can't reach the server, for
 * example when Tailscale is off. It never caches API/page data and never queues edits.
 *
 * This is a classic script served as-is from /sw.js (see next.config.ts for its headers).
 * Layout:
 *   1. Pure helpers: no globals, unit-tested through the guarded module.exports at the bottom.
 *   2. Event wiring: install / activate / fetch (offline fallback).
 *   3. Push: `push` and `notificationclick` listeners at the end of the wiring block, independent
 *      of the fetch logic above them. They never touch the network or any cache.
 */

// ---------------------------------------------------------------------------------------
// 1. Pure helpers
// ---------------------------------------------------------------------------------------

/** Bump the suffix when public/offline.html changes so old copies are evicted on activate. */
const OFFLINE_CACHE = "studydesk-offline-v1";
const OFFLINE_CACHE_PREFIX = "studydesk-offline-";
const OFFLINE_URL = "/offline.html";

/** Only GET page navigations are intercepted. Everything else goes straight to the network. */
function shouldHandleFetch(request) {
  return request.method === "GET" && request.mode === "navigate";
}

/**
 * The offline page replaces a response when the network request failed outright, or when the
 * reverse proxy (tailscale serve) answers 502/503/504 because the app container is down.
 */
function shouldServeOfflineFallback(outcome) {
  if (outcome.networkError) return true;
  return outcome.status === 502 || outcome.status === 503 || outcome.status === 504;
}

/** Older StudyDesk offline caches to delete. Foreign caches and the current one are kept. */
function staleCacheNames(keys, current) {
  return keys.filter((key) => key.startsWith(OFFLINE_CACHE_PREFIX) && key !== current);
}

const DEFAULT_URL = "/assignments";
const NOTIFICATION_ICON = "/icons/icon-192.png";
/** One Reminder replaces an earlier undismissed one instead of stacking. */
const NOTIFICATION_TAG = "studydesk-reminder";

/** Only same-origin absolute paths ("/x"), never "//host" or full URLs, may be opened on tap. */
function safePath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_URL;
}

/**
 * Reads the push body ({title, body, url}). A push with no or unreadable data still yields a
 * notification: iOS revokes push permission for a worker that receives a push and shows nothing.
 */
function parsePushPayload(text) {
  const fallback = {
    title: "StudyDesk",
    body: "You have assignments due today.",
    url: DEFAULT_URL,
  };
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return fallback;
  }
  if (!data || typeof data !== "object") return fallback;
  return {
    title: typeof data.title === "string" && data.title ? data.title : fallback.title,
    body: typeof data.body === "string" && data.body ? data.body : fallback.body,
    url: safePath(data.url),
  };
}

function buildNotification(payload) {
  return {
    title: payload.title,
    options: {
      body: payload.body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: NOTIFICATION_TAG,
      data: { url: payload.url },
    },
  };
}

/**
 * What a tap does: reuse an open app window (preferring one already on the target page) or open
 * a new one. `clientUrls` are the open window URLs; windows from other origins are ignored.
 */
function planNotificationClick(clientUrls, targetPath, origin) {
  const sameOrigin = [];
  clientUrls.forEach((href, index) => {
    try {
      const url = new URL(href);
      if (url.origin === origin) sameOrigin.push({ index, pathname: url.pathname });
    } catch {
      // Unparseable URL: not ours.
    }
  });
  const targetPathname = new URL(targetPath, origin).pathname;
  const onTarget = sameOrigin.find((c) => c.pathname === targetPathname);
  if (onTarget) return { action: "focus", index: onTarget.index, navigate: false };
  if (sameOrigin.length > 0) return { action: "focus", index: sameOrigin[0].index, navigate: true };
  return { action: "open", url: origin + targetPath };
}

// ---------------------------------------------------------------------------------------
// 2. Event wiring (only when running inside a real service worker)
// ---------------------------------------------------------------------------------------

if (typeof ServiceWorkerGlobalScope !== "undefined" && self instanceof ServiceWorkerGlobalScope) {
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches
        .open(OFFLINE_CACHE)
        // `reload` bypasses the HTTP cache so a fresh offline page is always stored.
        .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
        .then(() => self.skipWaiting()),
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(staleCacheNames(keys, OFFLINE_CACHE).map((key) => caches.delete(key))),
        )
        .then(() => self.clients.claim()),
    );
  });

  const offlineResponse = async () => {
    const cached = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
    return (
      cached ||
      new Response("Can't reach StudyDesk. Is Tailscale on?", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  };

  self.addEventListener("fetch", (event) => {
    if (!shouldHandleFetch(event.request)) return;

    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (shouldServeOfflineFallback({ networkError: false, status: response.status })) {
            return offlineResponse();
          }
          return response;
        } catch {
          return offlineResponse();
        }
      })(),
    );
  });

  // -------------------------------------------------------------------------------------
  // Push: show the Reminder, and open Assignments when it is tapped.
  // -------------------------------------------------------------------------------------
  self.addEventListener("push", (event) => {
    let text = null;
    try {
      text = event.data ? event.data.text() : null;
    } catch {
      text = null;
    }
    const { title, options } = buildNotification(parsePushPayload(text));
    // Always show something (see parsePushPayload).
    event.waitUntil(self.registration.showNotification(title, options));
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetPath = safePath(event.notification.data && event.notification.data.url);

    event.waitUntil(
      (async () => {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const plan = planNotificationClick(
          windows.map((w) => w.url),
          targetPath,
          self.location.origin,
        );
        if (plan.action === "open") {
          await self.clients.openWindow(plan.url);
          return;
        }
        const client = windows[plan.index];
        if (plan.navigate && "navigate" in client) {
          // navigate() resolves to the (possibly new) client; focus after it lands.
          const navigated = await client.navigate(targetPath);
          await (navigated || client).focus();
        } else {
          await client.focus();
        }
      })(),
    );
  });
}

// Lets Vitest import the pure helpers. `module` doesn't exist in a service worker.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    OFFLINE_CACHE,
    OFFLINE_URL,
    shouldHandleFetch,
    shouldServeOfflineFallback,
    staleCacheNames,
    parsePushPayload,
    buildNotification,
    planNotificationClick,
  };
}
