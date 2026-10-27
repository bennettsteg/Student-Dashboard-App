import { notFound } from "next/navigation";

import { courseGrades } from "@/lib/grades/store";
import { requireUserId } from "@/lib/session";
import { CourseGradesView } from "@/components/grades/CourseGradesView";

/**
 * Course detail: the Grade Scheme editor and Grade Entries table. New UI with no design yet,
 * derived from the Courses screen and flagged for the student's review.
 */
export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const userId = await requireUserId();
  const { courseId } = await params;

  const grades = await courseGrades(userId, courseId);
  if (!grades) notFound();

  return (
    <CourseGradesView
      course={{
        ...grades.course,
        categories: grades.categories.map((category) => ({
          ...category,
          entries: category.entries.map((entry) => ({
            ...entry,
            date: entry.date?.toISOString().slice(0, 10) ?? null,
          })),
        })),
      }}
    />
  );
}
