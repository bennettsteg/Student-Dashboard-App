"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { formatRelativeTime } from "@/lib/mail/relativeTime";
import { markAllNotificationsRead } from "@/server-actions/notification-actions";

export interface NotificationWidgetItem {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromAddress: string | null;
  receivedAt: string;
  isRead: boolean;
}

/** The most recent Notifications, with "Mark all read" (the same action as the Notifications page). */
export function NotificationWidget({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: NotificationWidgetItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card" aria-labelledby="notifications-heading">
      <header className="flex items-center justify-between px-5 pt-5 pb-3 md:px-6">
        <h2 id="notifications-heading" className="text-xl font-bold">
          Notifications
        </h2>
        <button
          type="button"
          disabled={pending || unreadCount === 0}
          onClick={markAllRead}
          className="text-sm font-semibold text-highlight hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Mark all read
        </button>
      </header>
      {items.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground md:px-6">
          No mail synced yet.{" "}
          <Link href="/notifications" className="text-highlight hover:underline">
            Open Notifications
          </Link>{" "}
          to sync.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
              <span
                aria-label={item.isRead ? "Read" : "Unread"}
                className={`size-2.5 shrink-0 rounded-full ${item.isRead ? "bg-muted-foreground/50" : "bg-highlight"}`}
              />
              <Link href="/notifications" className="min-w-0 flex-1">
                <span className={`block truncate ${item.isRead ? "font-medium" : "font-bold"}`}>
                  {item.subject || "(no subject)"}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {item.fromName || item.fromAddress || "Unknown sender"} ·{" "}
                  {/* Rendered from the viewer's clock, so server text may differ on hydration. */}
                  <span suppressHydrationWarning>
                    {formatRelativeTime(new Date(item.receivedAt), new Date())}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
