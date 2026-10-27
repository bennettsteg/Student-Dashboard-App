"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/mail/relativeTime";
import { describeSyncOutcome, type SyncMessage } from "@/lib/mail/syncMessage";
import { syncMail } from "@/server-actions/notification-actions";

export interface MailSyncStatusDTO {
  lastSuccessAt: string | null;
  lastError: string | null;
  needsReconnect: boolean;
}

/**
 * The same manual Mail Sync as the Notifications page (same server action, so the same
 * server-side cooldown and one-at-a-time rule), with the last-sync time beside it.
 */
export function SyncMailControl({ sync }: { sync: MailSyncStatusDTO }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<SyncMessage | null>(null);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    try {
      setMessage(describeSyncOutcome(await syncMail()));
      router.refresh();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Sync failed", isError: true });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync mail"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {sync.lastSuccessAt ? (
            <>
              Last synced{" "}
              <span suppressHydrationWarning title={new Date(sync.lastSuccessAt).toLocaleString()}>
                {formatRelativeTime(new Date(sync.lastSuccessAt), new Date())}
              </span>
            </>
          ) : (
            "Never synced"
          )}
        </span>
      </div>
      {message ? (
        <p className={`text-sm ${message.isError ? "text-destructive" : "text-muted-foreground"}`}>
          {message.text}
        </p>
      ) : (
        sync.lastError &&
        !sync.needsReconnect && (
          <p className="text-sm text-destructive">Last sync failed: {sync.lastError}</p>
        )
      )}
    </div>
  );
}
