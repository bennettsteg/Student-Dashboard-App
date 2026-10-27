import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { upcomingAssignments } from "@/lib/assignments/queries";
import { NotificationWidget } from "@/components/dashboard/NotificationWidget";
import type { MiniCalendarEvent } from "@/components/dashboard/MiniCalendarWidget";

import { MiniCalendarWidgetClient } from "./MiniCalendarWidgetClient";
import { NextAssignmentWidgetClient } from "./NextAssignmentWidgetClient";

function toCalendarEvents(
  assignments: { id: string; title: string; dueAt: Date; course: { color: string | null } }[],
): MiniCalendarEvent[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    start: assignment.dueAt.toISOString(),
    end: assignment.dueAt.toISOString(),
    allDay: false,
    courseColor: assignment.course.color,
  }));
}

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [allAssignments, unreadCount, recentMail, nextAssignments] = await Promise.all([
    prisma.assignment.findMany({
      where: { userId },
      include: { course: true },
    }),
    prisma.notificationItem.count({ where: { userId, source: "EMAIL", isRead: false } }),
    prisma.notificationItem.findMany({
      where: { userId, source: "EMAIL" },
      orderBy: { receivedAt: "desc" },
      take: 5,
    }),
    upcomingAssignments(userId),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <NextAssignmentWidgetClient items={nextAssignments} />
      <MiniCalendarWidgetClient title="Due dates" events={toCalendarEvents(allAssignments)} />
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
