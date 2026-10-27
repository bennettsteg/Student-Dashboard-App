import { prisma } from "@/lib/db";
import { currentGradesByCourse } from "@/lib/grades/store";
import { getProfile } from "@/lib/profile/profile";
import { requireUserId } from "@/lib/session";
import { formatDueDay } from "@/lib/time";
import { CoursesView } from "@/components/courses/CoursesView";
import type { CourseCardDTO } from "@/components/courses/types";

export default async function CoursesPage() {
  const userId = await requireUserId();
  const now = new Date();

  const [profile, grades] = await Promise.all([getProfile(userId), currentGradesByCourse(userId)]);
  const courses = await prisma.course.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assignments: true } },
      // Earliest Assignment not yet past due: the card's "Next due".
      assignments: {
        where: { dueAt: { gte: now } },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
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
    nextDueLabel: course.assignments[0]
      ? formatDueDay(course.assignments[0].dueAt, profile.timezone)
      : null,
    currentGrade: grades[course.id] ?? null,
  }));

  return <CoursesView courses={cards} />;
}
