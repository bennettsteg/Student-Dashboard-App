import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile/profile";
import { DEFAULT_TIMEZONE } from "@/lib/profile/validation";
import { requireUserId } from "@/lib/session";

import { AssignmentsView } from "./AssignmentsView";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const userId = await requireUserId();
  const { course, assignment: openAssignment } = await searchParams;

  const [profile, courses, assignments] = await Promise.all([
    getProfile(userId),
    prisma.course.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.assignment.findMany({ where: { userId }, orderBy: { dueAt: "asc" } }),
  ]);

  // An unknown or stale `?course=` just shows every Course.
  const courseFilter =
    typeof course === "string" && courses.some((c) => c.id === course) ? course : null;

  return (
    <AssignmentsView
      timeZone={profile.timezone}
      showTimeZoneHint={profile.timezone === DEFAULT_TIMEZONE}
      courses={courses.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      courseFilter={courseFilter}
      // Set by the header search; an unknown id simply opens nothing.
      openAssignmentId={typeof openAssignment === "string" ? openAssignment : null}
      assignments={assignments.map((a) => ({
        id: a.id,
        title: a.title,
        notes: a.notes,
        courseId: a.courseId,
        dueAt: a.dueAt.toISOString(),
      }))}
    />
  );
}
