import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { CourseForm } from "@/components/courses/CourseForm";

const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Interim Courses page: add a Course and see each one at a glance. Editing still happens
// from the Schedule grid until the Courses redesign lands.
export default async function CoursesPage() {
  const userId = await requireUserId();

  const courses = await prisma.course.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          events: { where: { isAssignment: true, source: "MANUAL", status: "ACTIVE" } },
        },
      },
    },
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl">Courses</h1>
        <p className="text-sm text-muted-foreground">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </p>
      </div>
      <CourseForm />
      {courses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No courses yet. Add one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/assignments/${course.id}`}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent"
            >
              <div>
                <h2 className="text-lg">{course.name}</h2>
                {course.code && <p className="text-sm text-muted-foreground">{course.code}</p>}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Meets</dt>
                  <dd className="font-semibold">
                    {course.daysOfWeek.map((d) => DAY_ABBREVIATIONS[d]).join(" / ")},{" "}
                    {formatTime(course.startTime)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Open assignments</dt>
                  <dd className="font-semibold">{course._count.events}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Location</dt>
                  <dd className="font-semibold">{course.location ?? "—"}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
