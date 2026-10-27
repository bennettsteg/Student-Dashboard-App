import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ScheduleGrid, type CourseScheduleDTO } from "@/components/courses/ScheduleGrid";

export default async function SchedulePage() {
  const userId = await requireUserId();

  const courses = await prisma.course.findMany({
    where: { userId },
    orderBy: { startTime: "asc" },
  });

  const courseDTOs: CourseScheduleDTO[] = courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    location: course.location,
    daysOfWeek: course.daysOfWeek,
    startTime: course.startTime,
    endTime: course.endTime,
    color: course.color,
  }));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl">Schedule</h1>
        <p className="text-sm text-muted-foreground">Weekly class times</p>
      </div>
      <ScheduleGrid courses={courseDTOs} />
    </div>
  );
}
