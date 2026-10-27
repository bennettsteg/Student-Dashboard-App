import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

import { MiniCalendarWidgetClient } from "../MiniCalendarWidgetClient";

// Interim Calendar page: a month grid of manual Assignment due dates, reusing the
// dashboard's calendar widget until the Calendar redesign lands.
export default async function CalendarPage() {
  const userId = await requireUserId();

  const assignments = await prisma.assignment.findMany({
    where: { userId },
    orderBy: { dueAt: "asc" },
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl">Calendar</h1>
        <p className="text-sm text-muted-foreground">Assignment due dates</p>
      </div>
      <MiniCalendarWidgetClient
        title="Due dates"
        events={assignments.map((a) => {
          const due = a.dueAt;
          return {
            id: a.id,
            title: a.title,
            start: due.toISOString(),
            end: due.toISOString(),
            allDay: false,
            // Leave uncoloured so the theme's "Due soon" chip styling applies.
            courseColor: null,
          };
        })}
      />
    </div>
  );
}
