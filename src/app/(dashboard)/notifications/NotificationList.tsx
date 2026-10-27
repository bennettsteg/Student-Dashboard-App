"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/mail/relativeTime";
import {
  markAllNotificationsRead,
  setNotificationRead,
  syncMail,
} from "@/server-actions/notification-actions";

export interface NotificationDTO {
  id: string;
  subject: string | null;
  preview: string | null;
  fromName: string | null;
  fromAddress: string | null;
  receivedAt: string;
  isRead: boolean;
  webLink: string | null;
}

export interface MailSyncStatusDTO {
  lastSuccessAt: string | null;
  lastError: string | null;
  needsReconnect: boolean;
}

type Filter = "all" | "unread";

// Times are rendered from the viewer's clock and timezone, so the server-rendered text can
// legitimately differ from the first client render.
function RelativeTime({ iso }: { iso: string }) {
  return (
    <span suppressHydrationWarning title={new Date(iso).toLocaleString()}>
      {formatRelativeTime(new Date(iso), new Date())}
    </span>
  );
}

export function NotificationList({
  items,
  unreadCount,
  sync,
}: {
  items: NotificationDTO[];
  unreadCount: number;
  sync: MailSyncStatusDTO;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = filter === "unread" ? items.filter((item) => !item.isRead) : items;

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const outcome = await syncMail();
      switch (outcome.status) {
        case "synced":
          setSyncMessage({
            text: `Synced ${outcome.count} recent message${outcome.count === 1 ? "" : "s"}.`,
            isError: false,
          });
          break;
        case "cooldown":
          setSyncMessage({
            text: `Mail was synced a moment ago. Try again in ${outcome.retryAfterSeconds} second${outcome.retryAfterSeconds === 1 ? "" : "s"}.`,
            isError: true,
          });
          break;
        case "already-running":
          setSyncMessage({ text: "A sync is already running.", isError: true });
          break;
        case "failed":
          setSyncMessage({ text: `Sync failed: ${outcome.error}`, isError: true });
          break;
      }
      router.refresh();
    } catch (e) {
      setSyncMessage({ text: e instanceof Error ? e.message : "Sync failed", isError: true });
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

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">{unreadCount} unread</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || unreadCount === 0}
          onClick={handleMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Filter notifications">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {sync.lastSuccessAt ? (
              <>
                Last synced <RelativeTime iso={sync.lastSuccessAt} />
              </>
            ) : (
              "Never synced"
            )}
          </span>
          <Button type="button" variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync mail"}
          </Button>
        </div>
      </div>

      {sync.needsReconnect && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Microsoft needs to be reconnected before mail can sync.{" "}
          <Link href="/settings" className="font-medium text-highlight underline underline-offset-4">
            Reconnect Microsoft in Settings
          </Link>
        </p>
      )}
      {syncMessage ? (
        <p className={`text-sm ${syncMessage.isError ? "text-destructive" : "text-muted-foreground"}`}>
          {syncMessage.text}
        </p>
      ) : (
        sync.lastError &&
        !sync.needsReconnect && (
          <p className="text-sm text-destructive">Last sync failed: {sync.lastError}</p>
        )
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {visible.length === 0 && (
          <li className="p-6 text-sm text-muted-foreground">
            {items.length === 0
              ? 'No mail synced yet. Press "Sync mail" to pull your recent Outlook messages.'
              : "No unread notifications."}
          </li>
        )}
        {visible.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <li key={item.id} className={item.isRead ? "" : "bg-muted/40"}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span
                  aria-label={item.isRead ? "Read" : "Unread"}
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.isRead ? "bg-muted-foreground/50" : "bg-highlight"}`}
                />
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${item.isRead ? "font-medium" : "font-bold"}`}
                    >
                      {item.subject || "(no subject)"}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {item.fromName || item.fromAddress || "Unknown sender"} ·{" "}
                      <RelativeTime iso={item.receivedAt} />
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => toggleRead(item.id, !item.isRead)}
                >
                  {item.isRead ? "Mark unread" : "Mark read"}
                </Button>
              </div>
              {expanded && (
                <div className="space-y-2 px-4 pb-4 pl-[2.375rem] text-sm">
                  <p className="whitespace-pre-line text-muted-foreground">
                    {item.preview || "No preview available."}
                  </p>
                  {item.webLink && (
                    <a
                      href={item.webLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-highlight underline-offset-4 hover:underline"
                    >
                      Open in Outlook
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
