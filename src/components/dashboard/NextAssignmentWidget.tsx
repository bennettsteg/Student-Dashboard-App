"use client";

import Link from "next/link";

import type { NextAssignmentDTO } from "@/lib/calendar/queries";

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Keeps, per course, only the items due on that course's earliest upcoming due day. */
function nextDueDayItems(items: NextAssignmentDTO[]): NextAssignmentDTO[] {
  const earliestDayByCourse = new Map<string, string>();
  const result: NextAssignmentDTO[] = [];
  for (const item of items) {
    const key = item.courseId ?? "__none__";
    const itemDayKey = dayKey(new Date(item.dueAt));

    const earliestDayKey = earliestDayByCourse.get(key);
    if (earliestDayKey === undefined) {
      earliestDayByCourse.set(key, itemDayKey);
    } else if (earliestDayKey !== itemDayKey) {
      continue;
    }

    result.push(item);
  }
  return result;
}

export function NextAssignmentWidget({ items }: { items: NextAssignmentDTO[] }) {
  const visible = nextDueDayItems(items);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
        <h2 className="text-lg font-semibold">Next due per class</h2>
        <Link href="/assignments" className="text-sm text-muted-foreground hover:underline">
          Assignments
        </Link>
      </div>
      <ul className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-card p-4">
        {visible.length === 0 && (
          <li className="text-sm text-muted-foreground">Nothing due — you&apos;re all caught up.</li>
        )}
        {visible.map((item) => (
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
              {new Date(item.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
