import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

import { CourseAssignmentsClient, type AssignmentDTO } from "./CourseAssignmentsClient";

export default async function CourseAssignmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const userId = await requireUserId();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({ where: { id: courseId, userId } });
  if (!course) notFound();

  const assignments = await prisma.assignment.findMany({
    where: { userId, courseId },
    orderBy: { dueAt: "asc" },
  });

  const assignmentDTOs: AssignmentDTO[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    dueAt: a.dueAt.toISOString(),
    notes: a.notes,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <Link href="/assignments" className="text-sm text-muted-foreground hover:underline">
          ← Assignments
        </Link>
        <h1 className="text-lg font-semibold">{course.name}</h1>
      </div>
      <CourseAssignmentsClient courseId={course.id} assignments={assignmentDTOs} />
    </div>
  );
}
