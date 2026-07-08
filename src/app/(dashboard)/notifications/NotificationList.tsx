"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { refreshNotifications, setNotificationRead } from "@/server-actions/notification-actions";

export interface NotificationDTO {
  id: string;
  subject: string | null;
  preview: string | null;
  fromName: string | null;
  fromAddress: string | null;
  receivedAt: string;
  isRead: boolean;
}

export function NotificationList({ items }: { items: NotificationDTO[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      await refreshNotifications();
      router.refresh();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  function toggleRead(id: string, isRead: boolean) {
    startTransition(async () => {
      await setNotificationRead(id, isRead);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync mail"}
        </Button>
        {syncError && <span className="text-sm text-destructive">{syncError}</span>}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            No mail synced yet. Click &quot;Sync mail&quot; to pull recent messages.
          </li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-start justify-between gap-3 p-4 ${item.isRead ? "" : "bg-primary/10"}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <span className="truncate font-medium">{item.subject || "(no subject)"}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.fromName || item.fromAddress || "Unknown sender"} ·{" "}
                {new Date(item.receivedAt).toLocaleString()}
              </p>
              {item.preview && (
                <p className="mt-1 truncate text-sm text-muted-foreground/70">{item.preview}</p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => toggleRead(item.id, !item.isRead)}
            >
              {item.isRead ? "Mark unread" : "Mark read"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
