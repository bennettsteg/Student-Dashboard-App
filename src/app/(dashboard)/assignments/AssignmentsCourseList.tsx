"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteCourses } from "@/server-actions/course-actions";

export interface AssignmentsCourseDTO {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  assignmentCount: number;
}

export function AssignmentsCourseList({ courses }: { courses: AssignmentsCourseDTO[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelected(new Set());
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleDelete() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Remove ${count} course${count === 1 ? "" : "s"}? This also removes their assignments.`)) {
      return;
    }
    startTransition(async () => {
      await deleteCourses(Array.from(selected));
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        {selectMode && selected.size > 0 && (
          <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
            {pending ? "Deleting…" : `Delete (${selected.size})`}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={toggleSelectMode}>
          {selectMode ? "Cancel" : "Select"}
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {courses.map((course) => {
          const rowContent = (
            <>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: course.color ?? "#a0a2a8" }}
                />
                <span className="font-medium">{course.name}</span>
                {course.code && <span className="text-muted-foreground">({course.code})</span>}
              </span>
              <span className="text-muted-foreground">
                {course.assignmentCount} assignment{course.assignmentCount === 1 ? "" : "s"}
              </span>
            </>
          );

          return (
            <li key={course.id}>
              {selectMode ? (
                <div
                  onClick={() => toggle(course.id, !selected.has(course.id))}
                  className="flex cursor-pointer items-center gap-3 p-4 text-sm hover:bg-accent"
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(course.id)}
                      onCheckedChange={(checked) => toggle(course.id, checked === true)}
                    />
                  </span>
                  <span className="flex flex-1 items-center justify-between gap-2">{rowContent}</span>
                </div>
              ) : (
                <Link
                  href={`/assignments/${course.id}`}
                  className="flex items-center justify-between gap-2 p-4 text-sm hover:bg-accent"
                >
                  {rowContent}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
