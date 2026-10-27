import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";

// Month grid of open Assignment due dates only (completed Assignments are deleted, so every
// row is open). Day grouping happens in the browser's timezone — see CalendarMonth.
export default async function CalendarPage() {
  const userId = await requireUserId();

  const assignments = await prisma.assignment.findMany({
    where: { userId },
    include: { course: { select: { name: true } } },
    orderBy: { dueAt: "asc" },
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <CalendarMonth
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
