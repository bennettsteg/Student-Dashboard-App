"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AssignmentForm, type AssignmentFormValues } from "@/components/calendar/AssignmentForm";
import { toDateValue, toTimeValue } from "@/lib/dates";

export interface AssignmentDTO {
  id: string;
  title: string;
  dueAt: string;
}

export function CourseAssignmentsClient({
  courseId,
  assignments,
}: {
  courseId: string;
  assignments: AssignmentDTO[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<AssignmentFormValues>({
    title: "",
    courseId,
    day: "",
    time: "",
  });

  function openCreateForm() {
    const now = new Date();
    setFormValues({
      title: "",
      courseId,
      day: toDateValue(now),
      time: toTimeValue(now),
    });
    setFormOpen(true);
  }

  function openEditForm(assignment: AssignmentDTO) {
    const due = new Date(assignment.dueAt);
    setFormValues({
      id: assignment.id,
      title: assignment.title,
      courseId,
      day: toDateValue(due),
      time: toTimeValue(due),
    });
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          + Add assignment
        </button>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {assignments.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No assignments yet.</li>
        )}
        {assignments.map((assignment) => (
          <li key={assignment.id}>
            <button
              type="button"
              onClick={() => openEditForm(assignment)}
              className="flex w-full items-center justify-between gap-2 p-4 text-left text-sm hover:bg-accent"
            >
              <span className="font-medium">{assignment.title}</span>
              <span className="shrink-0 text-muted-foreground">
                {new Date(assignment.dueAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <AssignmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        courses={[]}
        initialValues={formValues}
        onSaved={() => router.refresh()}
        lockedCourseId={courseId}
      />
    </div>
  );
}
