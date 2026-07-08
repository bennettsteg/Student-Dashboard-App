import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getValidAccessToken } from "@/lib/graph/token";

import { SyncButton } from "./SyncButton";

async function getMicrosoftConnectionStatus(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
  });
  if (!account) {
    return { connected: false, detail: "No Microsoft account linked. Sign out and sign in again." };
  }

  try {
    await getValidAccessToken(userId);
    return { connected: true, detail: `Scopes: ${account.scope ?? "unknown"}` };
  } catch (e) {
    return {
      connected: false,
      detail: e instanceof Error ? e.message : "Could not validate the Microsoft connection.",
    };
  }
}

export default async function SettingsPage() {
  const userId = await requireUserId();
  const icsUrl = process.env.BLACKBOARD_ICS_URL;
  const syncIntervalMinutes = process.env.SYNC_INTERVAL_MINUTES ?? "120";
  const connection = await getMicrosoftConnectionStatus(userId);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <div className="max-w-md space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Microsoft connection</h2>
        <p className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${connection.connected ? "bg-green-500" : "bg-destructive"}`}
          />
          {connection.connected ? "Connected" : "Not connected"}
        </p>
        <p className="text-sm text-muted-foreground">{connection.detail}</p>
      </div>

      <div className="max-w-md space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Blackboard calendar sync</h2>
        <p className="text-sm text-muted-foreground">
          Feed URL: {icsUrl ? <code className="break-all">{icsUrl}</code> : "not configured"}
        </p>
        <p className="text-sm text-muted-foreground">
          Background sync runs every {syncIntervalMinutes} minutes. Events you edit after syncing
          are never overwritten by future syncs.
        </p>
        <SyncButton />
      </div>
    </div>
  );
}
