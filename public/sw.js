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
 *   3. Push (ticket #15): add `push` and `notificationclick` listeners in the marked section
 *      at the end of the wiring block. They are independent of the fetch logic above it.
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
  // Push (ticket #15): add `self.addEventListener("push", ...)` and
  // `self.addEventListener("notificationclick", ...)` here.
  // -------------------------------------------------------------------------------------
}

// Lets Vitest import the pure helpers. `module` doesn't exist in a service worker.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    OFFLINE_CACHE,
    OFFLINE_URL,
    shouldHandleFetch,
    shouldServeOfflineFallback,
    staleCacheNames,
  };
}
