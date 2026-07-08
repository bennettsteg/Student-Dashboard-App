import { syncBlackboardCalendarForAllUsers } from "@/lib/ical/sync";

const icsUrl = process.env.BLACKBOARD_ICS_URL;
const intervalMinutes = Number(process.env.SYNC_INTERVAL_MINUTES ?? "120");

if (!icsUrl) {
  console.error("[worker] BLACKBOARD_ICS_URL is not set; nothing to sync. Exiting.");
  process.exit(1);
}

async function runSync() {
  console.log(`[worker] starting Blackboard sync at ${new Date().toISOString()}`);
  try {
    const results = await syncBlackboardCalendarForAllUsers(icsUrl!);
    console.log("[worker] sync complete:", results);
  } catch (error) {
    console.error("[worker] sync failed:", error);
  }
}

console.log(`[worker] scheduling Blackboard sync every ${intervalMinutes} minute(s)`);
runSync();
setInterval(runSync, intervalMinutes * 60 * 1000);
