import Link from "next/link";

import { formatPercent } from "@/lib/grades/format";

export interface DashboardCourse {
  id: string;
  name: string;
  instructor: string | null;
  /** Current Grade percentage, or null until the Course has a Grade Entry. */
  currentGrade: number | null;
}

/** Each Course with its Current Grade (a dash, never 0%, until there is a Grade Entry). */
export function CoursesGrid({ courses }: { courses: DashboardCourse[] }) {
  return (
    <section aria-labelledby="courses-heading" className="flex flex-col gap-4">
      <h2 id="courses-heading" className="text-xl font-bold">
        Courses
      </h2>
      {courses.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          No courses yet.{" "}
          <Link href="/courses" className="text-highlight hover:underline">
            Add one on the Courses page.
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="rounded-xl border border-border bg-card p-5 transition-colors outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <h3 className="truncate text-lg font-bold">{course.name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {course.instructor ?? "No instructor"}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>Current grade</span>
                <span
                  className={`font-semibold ${course.currentGrade === null ? "text-muted-foreground" : ""}`}
                >
                  {formatPercent(course.currentGrade)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
                {course.currentGrade !== null && (
                  <div
                    className="h-full rounded-full bg-highlight"
                    style={{ width: `${Math.min(Math.max(course.currentGrade, 0), 100)}%` }}
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
