import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { nextAssignmentPerCourse } from "@/lib/calendar/queries";
import { NotificationWidget } from "@/components/dashboard/NotificationWidget";
import { NextAssignmentWidget } from "@/components/dashboard/NextAssignmentWidget";
import type { MiniCalendarEvent } from "@/components/dashboard/MiniCalendarWidget";

import { MiniCalendarWidgetClient } from "./MiniCalendarWidgetClient";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [events, unreadCount, recentMail, nextAssignments] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId, status: "ACTIVE" },
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

  const calendarEvents: MiniCalendarEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startAt.toISOString(),
    end: event.endAt.toISOString(),
    allDay: event.allDay,
    courseColor: event.course?.color ?? null,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      <MiniCalendarWidgetClient events={calendarEvents} />
      <NextAssignmentWidget items={nextAssignments} />
    </div>
  );
}
