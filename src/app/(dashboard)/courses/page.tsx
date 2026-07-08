import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

import { CourseForm } from "./CourseForm";
import { DeleteCourseButton } from "./DeleteCourseButton";

export default async function CoursesPage() {
  const userId = await requireUserId();

  const courses = await prisma.course.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-lg font-semibold">Courses</h1>
      <CourseForm />
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {courses.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No courses yet.</li>
        )}
        {courses.map((course) => (
          <li key={course.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: course.color ?? "#a0a2a8" }}
              />
              <span className="font-medium">{course.name}</span>
              {course.code && (
                <span className="text-sm text-muted-foreground">({course.code})</span>
              )}
            </div>
            <DeleteCourseButton id={course.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
