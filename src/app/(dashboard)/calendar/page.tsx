import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile/profile";
import { requireUserId } from "@/lib/session";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";

// Month grid of open Assignment due dates only (completed Assignments are deleted, so every
// row is open). Day grouping and "today" use the profile timezone.
export default async function CalendarPage() {
  const userId = await requireUserId();

  const [profile, assignments] = await Promise.all([
    getProfile(userId),
    prisma.assignment.findMany({
      where: { userId },
      include: { course: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <CalendarMonth
        timeZone={profile.timezone}
        assignments={assignments.map((a) => ({
          id: a.id,
          title: a.title,
          dueAt: a.dueAt.toISOString(),
          courseName: a.course.name,
        }))}
      />
    </div>
  );
}
