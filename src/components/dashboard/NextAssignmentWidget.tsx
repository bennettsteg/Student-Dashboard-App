import Link from "next/link";

import type { NextAssignmentDTO } from "@/lib/calendar/queries";

export function NextAssignmentWidget({ items }: { items: NextAssignmentDTO[] }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Next due per class</h2>
        <Link href="/calendar" className="text-sm text-muted-foreground hover:underline">
          Calendar
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">Nothing due — you&apos;re all caught up.</li>
        )}
        {items.map((item) => (
          <li key={item.eventId} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.courseColor ?? "#a0a2a8" }}
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{item.courseName}</span>
              <span className="text-muted-foreground"> — {item.title}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">
              {item.dueAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
