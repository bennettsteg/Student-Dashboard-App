import { prisma } from "@/lib/db";
import { earliestDueByCourse } from "@/lib/courses/nextDue";
import { currentGradesByCourse } from "@/lib/grades/store";
import { getProfile } from "@/lib/profile/profile";
import { requireUserId } from "@/lib/session";
import { formatDueDay } from "@/lib/time";
import { CoursesView } from "@/components/courses/CoursesView";
import type { CourseCardDTO } from "@/components/courses/types";

export default async function CoursesPage() {
  const userId = await requireUserId();

  const [profile, grades, nextDue] = await Promise.all([
    getProfile(userId),
    currentGradesByCourse(userId),
    earliestDueByCourse(userId),
  ]);
  const courses = await prisma.course.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assignments: true } },
    },
  });

  const cards: CourseCardDTO[] = courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    instructor: course.instructor,
    location: course.location,
    daysOfWeek: course.daysOfWeek,
    startTime: course.startTime,
    endTime: course.endTime,
    color: course.color,
    openAssignments: course._count.assignments,
    // The earliest open Assignment, overdue included, so a Course with only overdue work
    // never shows a dash beside a non-zero open count.
    nextDueLabel: nextDue.has(course.id) ? formatDueDay(nextDue.get(course.id)!, profile.timezone) : null,
    currentGrade: grades[course.id] ?? null,
  }));

  return <CoursesView courses={cards} />;
}
