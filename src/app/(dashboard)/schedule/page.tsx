import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { CourseForm } from "@/components/courses/CourseForm";
import { ScheduleGrid, type CourseScheduleDTO } from "@/components/courses/ScheduleGrid";

export default async function CoursesSchedulePage() {
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
      <h1 className="text-lg font-semibold">Courses & Schedule</h1>
      <CourseForm />
      <ScheduleGrid courses={courseDTOs} />
    </div>
  );
}
