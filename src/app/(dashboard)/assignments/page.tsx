import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export default async function AssignmentsPage() {
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
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-lg font-semibold">Assignments</h1>
      {courses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Add a course on the{" "}
          <Link href="/schedule" className="underline hover:text-foreground">
            Courses & Schedule
          </Link>{" "}
          page before adding assignments.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/assignments/${course.id}`}
                className="flex items-center justify-between gap-2 p-4 text-sm hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: course.color ?? "#a0a2a8" }}
                  />
                  <span className="font-medium">{course.name}</span>
                  {course.code && <span className="text-muted-foreground">({course.code})</span>}
                </span>
                <span className="text-muted-foreground">
                  {course._count.events} assignment{course._count.events === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
