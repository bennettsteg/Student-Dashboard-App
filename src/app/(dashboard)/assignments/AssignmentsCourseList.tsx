"use client";

import Link from "next/link";

export interface AssignmentsCourseDTO {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  assignmentCount: number;
}

// Courses are managed (added, edited, dropped) only from the Courses section.
export function AssignmentsCourseList({ courses }: { courses: AssignmentsCourseDTO[] }) {
  return (
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
                style={{ backgroundColor: course.color ?? "var(--muted-foreground)" }}
              />
              <span className="font-medium">{course.name}</span>
              {course.code && <span className="text-muted-foreground">({course.code})</span>}
            </span>
            <span className="text-muted-foreground">
              {course.assignmentCount} assignment{course.assignmentCount === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
