import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { visibleAssignments } from "@/lib/assignments/list";
import { assignmentStatus } from "@/lib/assignments/status";
import { formatHeaderDate, greeting } from "@/lib/dashboard/greeting";
import { summaryStats, weekStrip } from "@/lib/dashboard/summary";
import { currentGradesByCourse } from "@/lib/grades/store";
import { getProfile } from "@/lib/profile/profile";
import { formatDueDay } from "@/lib/time";
import { AddAssignmentButton } from "@/components/dashboard/AddAssignmentButton";
import { CoursesGrid } from "@/components/dashboard/CoursesGrid";
import { HeaderSearch } from "@/components/dashboard/HeaderSearch";
import { NextDuePanel } from "@/components/dashboard/NextDuePanel";
import { NotificationWidget } from "@/components/dashboard/NotificationWidget";
import { StatCards } from "@/components/dashboard/StatCards";
import { ThisWeekStrip } from "@/components/dashboard/ThisWeekStrip";

const NEXT_DUE_LIMIT = 5;
const RECENT_NOTIFICATIONS = 4;

// Rendered on the server using the saved profile timezone (not the browser's), so "today",
// "this week" and the greeting follow the student's chosen timezone.
export default async function DashboardPage() {
  const userId = await requireUserId();
  const now = new Date();

  // Two small batches rather than one wide Promise.all: the local dev database (Prisma's
  // PGlite server) drops connections beyond about three concurrent queries.
  const [profile, courses, assignments] = await Promise.all([
    getProfile(userId),
    prisma.course.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.assignment.findMany({
      where: { userId },
      select: { id: true, title: true, courseId: true, dueAt: true },
    }),
  ]);
  const [grades, unreadCount, recentMail] = await Promise.all([
    currentGradesByCourse(userId),
    prisma.notificationItem.count({ where: { userId, source: "EMAIL", isRead: false } }),
    prisma.notificationItem.findMany({
      where: { userId, source: "EMAIL" },
      orderBy: { receivedAt: "desc" },
      take: RECENT_NOTIFICATIONS,
    }),
  ]);

  const timeZone = profile.timezone;
  const stats = summaryStats(assignments, now, timeZone);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const nextDue = visibleAssignments(assignments, null)
    .slice(0, NEXT_DUE_LIMIT)
    .map((a) => ({
      id: a.id,
      title: a.title,
      courseName: courseById.get(a.courseId)?.name ?? "—",
      dueLabel: formatDueDay(a.dueAt, timeZone),
      status: assignmentStatus(a.dueAt, now, timeZone),
    }));

  const courseOptions = courses.map((c) => ({ id: c.id, name: c.name, color: c.color }));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{greeting(now, timeZone, profile.name)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatHeaderDate(now, timeZone, profile.termLabel)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HeaderSearch
            assignments={assignments.map((a) => ({ id: a.id, title: a.title, courseId: a.courseId }))}
            courses={courses.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
          />
          <AddAssignmentButton courses={courseOptions} />
        </div>
      </header>

      <StatCards
        dueThisWeek={stats.dueThisWeek}
        nextDueLabel={stats.nextDueAt ? formatDueDay(stats.nextDueAt, timeZone) : null}
        openCount={stats.openCount}
        courseCount={stats.courseCount}
        unreadCount={unreadCount}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <NextDuePanel items={nextDue} />
        <div className="flex flex-col gap-6">
          <NotificationWidget
            unreadCount={unreadCount}
            items={recentMail.map((m) => ({
              id: m.id,
              subject: m.subject,
              fromName: m.fromName,
              fromAddress: m.fromAddress,
              receivedAt: m.receivedAt.toISOString(),
              isRead: m.isRead,
            }))}
          />
          <ThisWeekStrip days={weekStrip(assignments, now, timeZone)} />
        </div>
      </div>

      <CoursesGrid
        courses={courses.map((c) => ({
          id: c.id,
          name: c.name,
          instructor: c.instructor,
          currentGrade: grades[c.id] ?? null,
        }))}
      />
    </div>
  );
}
