// Long-running background worker. Its only job today is the automatic Mail Sync (ADR-0002);
// the daily Reminder digest will be added alongside it. Blackboard sync was removed (ADR-0001).
//
// Run exactly ONE instance. The guard state is persisted, so a restart never causes an extra
// sync, but two instances ticking at once would each evaluate the guard and could both sync.
//
// The schedule is an hourly tick that asks the database "is a sync due?" (see
// src/lib/mail/autoSyncGuard.ts); there is no sleep-until-tomorrow loop to drift or double-fire.

import { runMailAutoSyncTick } from "@/lib/mail/autoSync";

const TICK_MS = 60 * 60 * 1000;

let ticking = false;

async function tick() {
  // Never let a slow tick overlap the next one.
  if (ticking) return;
  ticking = true;
  try {
    const r = await runMailAutoSyncTick();
    console.log(
      `[worker] mail tick: ${r.checked} user(s) checked, ${r.started} due, ` +
        `${r.synced} synced, ${r.failed} failed`,
    );
  } catch (e) {
    // The tick itself failing (e.g. database unreachable) is just retried next hour.
    console.error("[worker] mail tick failed:", e instanceof Error ? e.message : e);
  } finally {
    ticking = false;
  }
}

console.log(`[worker] started; mail auto-sync ticks every ${TICK_MS / 60_000} minutes.`);

// Tick once at startup: harmless after a restart because the guard reads persisted state.
void tick();
const interval = setInterval(() => void tick(), TICK_MS);

function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down.`);
  clearInterval(interval);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
