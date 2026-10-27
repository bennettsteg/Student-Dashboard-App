"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  AssignmentForm,
  type AssignmentFormValues,
  type CourseOption,
} from "@/components/assignments/AssignmentForm";
import { StatusBadge } from "@/components/assignments/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_DUE_TIME, visibleAssignments } from "@/lib/assignments/list";
import { assignmentStatus } from "@/lib/assignments/status";
import { toDateValue, toTimeValue } from "@/lib/dates";
import { completeAssignment } from "@/server-actions/assignment-actions";

export interface AssignmentDTO {
  id: string;
  title: string;
  notes: string | null;
  courseId: string;
  dueAt: string; // ISO
}

const ALL_COURSES = "all";

/**
 * The open-Assignments table. Everything time-related (status, the formatted due date, the
 * default due day) is derived here in the browser, using the browser's own timezone, because
 * the server may run in a different one (e.g. a UTC Docker host). Hence the page loads this
 * component client-only.
 */
export function AssignmentsView({
  assignments,
  courses,
  courseFilter,
}: {
  assignments: AssignmentDTO[];
  courses: CourseOption[];
  /** The Course the table is filtered to, or null for all Courses. */
  courseFilter: string | null;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<AssignmentFormValues>(emptyForm(courseFilter));
  const [completing, setCompleting] = useState<AssignmentDTO | null>(null);
  const [pending, startTransition] = useTransition();

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const rows = visibleAssignments(assignments, courseFilter);

  function emptyForm(courseId: string | null): AssignmentFormValues {
    return {
      title: "",
      // With a filter on, new work most likely belongs to that Course; with a single Course
      // there is nothing to choose.
      courseId: courseId ?? (courses.length === 1 ? courses[0].id : ""),
      day: toDateValue(new Date()),
      time: DEFAULT_DUE_TIME,
      notes: "",
    };
  }

  function openAdd() {
    setFormValues(emptyForm(courseFilter));
    setFormOpen(true);
  }

  function openEdit(assignment: AssignmentDTO) {
    const due = new Date(assignment.dueAt);
    setFormValues({
      id: assignment.id,
      title: assignment.title,
      courseId: assignment.courseId,
      day: toDateValue(due),
      time: toTimeValue(due),
      notes: assignment.notes ?? "",
    });
    setFormOpen(true);
  }

  function setFilter(courseId: string) {
    router.replace(courseId === ALL_COURSES ? "/assignments" : `/assignments?course=${courseId}`, {
      scroll: false,
    });
  }

  function confirmComplete() {
    if (!completing) return;
    const id = completing.id;
    startTransition(async () => {
      try {
        await completeAssignment(id);
      } finally {
        setCompleting(null);
        router.refresh();
      }
    });
  }

  const subtitle =
    courseFilter && rows.length !== assignments.length
      ? `${rows.length} of ${assignments.length} open`
      : `${assignments.length} open`;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {courses.length > 0 && (
          <Button type="button" size="lg" onClick={openAdd}>
            Add assignment
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Add a course on the{" "}
          <Link href="/courses" className="text-highlight underline hover:text-foreground">
            Courses
          </Link>{" "}
          page before adding assignments.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span id="assignments-course-filter-label" className="text-sm text-muted-foreground">
              Course
            </span>
            <Select
              value={courseFilter ?? ALL_COURSES}
              items={[
                { value: ALL_COURSES, label: "All courses" },
                ...courses.map((course) => ({ value: course.id, label: course.name })),
              ]}
              onValueChange={(value) => setFilter(value ?? ALL_COURSES)}
            >
              <SelectTrigger aria-labelledby="assignments-course-filter-label" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COURSES}>All courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <p className="font-semibold">No open assignments</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {courseFilter
                  ? "Nothing is due for this course. Pick another course or add an assignment."
                  : "You're all caught up. Add an assignment when something new is due."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div
                aria-hidden
                className="hidden grid-cols-[2fr_1.5fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 text-xs font-semibold text-muted-foreground md:grid"
              >
                <span>Assignment</span>
                <span>Course</span>
                <span>Due</span>
                <span>Status</span>
                <span className="w-24" />
              </div>
              <ul className="divide-y divide-border">
                {rows.map((assignment) => {
                  const due = new Date(assignment.dueAt);
                  const status = assignmentStatus(due, now, timeZone);
                  const course = courseById.get(assignment.courseId);
                  return (
                    <li
                      key={assignment.id}
                      className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/40 md:grid-cols-[2fr_1.5fr_1fr_1fr_auto] md:px-5"
                      onClick={() => openEdit(assignment)}
                    >
                      <button
                        type="button"
                        className="col-start-1 text-left font-bold outline-none focus-visible:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(assignment);
                        }}
                      >
                        {assignment.title}
                      </button>
                      <span className="col-start-1 text-sm text-muted-foreground md:col-start-auto">
                        {course?.name ?? "—"}
                      </span>
                      <span className="col-start-1 text-sm md:col-start-auto">
                        {due.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        <span className="text-muted-foreground">
                          {" "}
                          · {due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </span>
                      <span className="col-start-1 md:col-start-auto">
                        <StatusBadge status={status} />
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="col-start-2 row-span-4 row-start-1 w-24 self-center md:col-start-auto md:row-span-1 md:row-start-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompleting(assignment);
                        }}
                      >
                        Complete
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      <AssignmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        courses={courses}
        initialValues={formValues}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={completing !== null}
        onOpenChange={(open) => {
          if (!open) setCompleting(null);
        }}
        title="Complete this assignment?"
        description={`"${completing?.title ?? ""}" will be permanently deleted. This can't be undone.`}
        confirmLabel="Yes, complete"
        pending={pending}
        onConfirm={confirmComplete}
      />
    </div>
  );
}
