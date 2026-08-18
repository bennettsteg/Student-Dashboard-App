import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { nextAssignmentPerCourse } from "@/lib/calendar/queries";
import { NotificationWidget } from "@/components/dashboard/NotificationWidget";
import { NextAssignmentWidget } from "@/components/dashboard/NextAssignmentWidget";
import type { MiniCalendarEvent } from "@/components/dashboard/MiniCalendarWidget";

import { MiniCalendarWidgetClient } from "./MiniCalendarWidgetClient";

function toCalendarEvents(
  events: { id: string; title: string; startAt: Date; endAt: Date; allDay: boolean; course: { color: string | null } | null }[],
): MiniCalendarEvent[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startAt.toISOString(),
    end: event.endAt.toISOString(),
    allDay: event.allDay,
    courseColor: event.course?.color ?? null,
  }));
}

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [classEvents, blackboardEvents, unreadCount, recentMail, nextAssignments] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId, status: "ACTIVE", source: "MANUAL" },
      include: { course: true },
    }),
    prisma.calendarEvent.findMany({
      where: { userId, status: "ACTIVE", source: "BLACKBOARD_ICS" },
      include: { course: true },
    }),
    prisma.notificationItem.count({ where: { userId, source: "EMAIL", isRead: false } }),
    prisma.notificationItem.findMany({
      where: { userId, source: "EMAIL" },
      orderBy: { receivedAt: "desc" },
      take: 5,
    }),
    nextAssignmentPerCourse(userId),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <MiniCalendarWidgetClient title="Class Calendar" events={toCalendarEvents(classEvents)} />
      <NextAssignmentWidget items={nextAssignments} />
      <MiniCalendarWidgetClient
        title="Blackboard Calendar"
        events={toCalendarEvents(blackboardEvents)}
      />
      <NotificationWidget
        unreadCount={unreadCount}
        items={recentMail.map((m) => ({
          id: m.id,
          subject: m.subject,
          fromName: m.fromName,
          fromAddress: m.fromAddress,
          receivedAt: m.receivedAt.toISOString(),
        }))}
      />
    </div>
  );
}
