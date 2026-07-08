import Link from "next/link";

export interface NotificationWidgetItem {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromAddress: string | null;
  receivedAt: string;
}

export function NotificationWidget({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: NotificationWidgetItem[];
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          Mail{" "}
          {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {unreadCount} unread
            </span>
          )}
        </h2>
        <Link href="/notifications" className="text-sm text-muted-foreground hover:underline">
          View all
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">No mail synced yet.</li>
        )}
        {items.map((item) => (
          <li key={item.id} className="truncate text-sm">
            <span className="font-medium">{item.fromName || item.fromAddress}</span>
            <span className="text-muted-foreground"> — {item.subject || "(no subject)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
