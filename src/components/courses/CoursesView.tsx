"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { meetingSummary } from "@/lib/courses/validation";
import { formatPercent } from "@/lib/grades/format";

import { CourseDropDialog } from "./CourseDropDialog";
import { CourseFormDialog } from "./CourseFormDialog";
import type { CourseCardDTO } from "./types";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold">{children}</dd>
    </div>
  );
}

function CourseCard({
  course,
  onEdit,
  onDrop,
}: {
  course: CourseCardDTO;
  onEdit: () => void;
  onDrop: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg">
            <Link
              href={`/courses/${course.id}`}
              className="hover:underline focus-visible:underline"
            >
              {course.name}
            </Link>
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {course.instructor ?? "No instructor"}
            {course.code ? ` · ${course.code}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Current Grade: a dash until the Course has a Grade Entry, never a misleading 0%. */}
          <span
            className={`mr-1 text-2xl font-bold ${course.currentGrade === null ? "text-muted-foreground" : ""}`}
            aria-label={
              course.currentGrade === null
                ? "No current grade yet"
                : `Current grade ${formatPercent(course.currentGrade)}`
            }
          >
            {formatPercent(course.currentGrade)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${course.name}`}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Drop ${course.name}`}
            onClick={onDrop}
          >
            <Trash2 />
          </Button>
        </div>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        {course.currentGrade !== null && (
          <div
            className="h-full rounded-full bg-highlight"
            style={{ width: `${Math.min(Math.max(course.currentGrade, 0), 100)}%` }}
          />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Meets">
          {meetingSummary(course.daysOfWeek, course.startTime) ?? "No set times"}
        </Stat>
        <Stat label="Next due">
          {course.nextDueLabel ?? "—"}
        </Stat>
        <Stat label="Location">{course.location ?? "—"}</Stat>
        <Stat label="Open assignments">{course.openAssignments}</Stat>
      </dl>
    </article>
  );
}

export function CoursesView({ courses }: { courses: CourseCardDTO[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseCardDTO | null>(null);
  const [dropping, setDropping] = useState<CourseCardDTO | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(course: CourseCardDTO) {
    setEditing(course);
    setFormOpen(true);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {courses.length} {courses.length === 1 ? "course" : "courses"}
          </p>
        </div>
        <Button type="button" onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Add course
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No courses yet. Add one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={() => openEdit(course)}
              onDrop={() => setDropping(course)}
            />
          ))}
        </div>
      )}

      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editing}
        onSaved={() => router.refresh()}
      />
      <CourseDropDialog
        course={dropping}
        onClose={() => setDropping(null)}
        onDropped={() => router.refresh()}
      />
    </div>
  );
}
