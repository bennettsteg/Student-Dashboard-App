// Long-running background worker. It currently has no scheduled jobs (Blackboard
// sync was removed, ADR-0001); the daily mail auto-sync (ADR-0002) will be
// registered here. Until then it just stays alive and idle so the compose
// `worker` service keeps running cleanly.

const HEARTBEAT_MS = 24 * 60 * 60 * 1000;

console.log("[worker] started; no jobs scheduled, idling.");

const heartbeat = setInterval(() => {
  console.log(`[worker] idle heartbeat at ${new Date().toISOString()}`);
}, HEARTBEAT_MS);

function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down.`);
  clearInterval(heartbeat);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
