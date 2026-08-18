import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

import { AssignmentsCourseList } from "./AssignmentsCourseList";

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
        <AssignmentsCourseList
          courses={courses.map((course) => ({
            id: course.id,
            name: course.name,
            code: course.code,
            color: course.color,
            assignmentCount: course._count.events,
          }))}
        />
      )}
    </div>
  );
}
