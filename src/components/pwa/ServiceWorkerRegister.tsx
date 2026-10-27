"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (the offline-fallback service worker) once the app has loaded.
 * Production only, so `next dev` is never affected by a lingering worker. Registration
 * needs a secure context, which is why the deployment serves HTTPS over the tailnet.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // updateViaCache: "none" makes the browser always revalidate sw.js itself.
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("Service worker registration failed", error));
  }, []);

  return null;
}
