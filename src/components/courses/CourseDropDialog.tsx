"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CourseDropImpact } from "@/lib/courses/drop";
import { deleteCourse, getCourseDropImpact } from "@/server-actions/course-actions";

interface CourseDropDialogProps {
  /** The Course being dropped, or null when the dialog is closed. */
  course: { id: string; name: string } | null;
  onClose: () => void;
  onDropped: () => void;
}

function plural(count: number, noun: string): string {
  if (count === 1) return `1 ${noun}`;
  const many = noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  return `${count} ${many}`;
}

/** "the course, 2 assignments and 3 grade entries": only the things that exist are listed. */
function dropSentence(impact: CourseDropImpact): string {
  const parts = ["the course"];
  if (impact.assignments > 0) parts.push(plural(impact.assignments, "assignment"));
  if (impact.gradeCategories > 0) parts.push(plural(impact.gradeCategories, "grade category"));
  if (impact.gradeEntries > 0) parts.push(plural(impact.gradeEntries, "grade entry"));
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `This permanently deletes ${list}. This cannot be undone.`;
}

/** Confirm dropping a Course, listing what is deleted along with it. */
export function CourseDropDialog({ course, onClose, onDropped }: CourseDropDialogProps) {
  // The loaded impact is keyed by Course so a stale result is never shown for another one.
  const [loaded, setLoaded] = useState<{ courseId: string; impact: CourseDropImpact | null } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const courseId = course?.id ?? null;
  const impact = loaded && loaded.courseId === courseId ? loaded.impact : null;

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    getCourseDropImpact(courseId).then((result) => {
      if (!cancelled) setLoaded({ courseId, impact: result });
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function handleConfirm() {
    if (!course) return;
    setSubmitting(true);
    try {
      await deleteCourse(course.id);
      onDropped();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={course !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Drop {course?.name}?</DialogTitle>
          <DialogDescription>
            {impact === null
              ? "Checking what this will delete…"
              : dropSentence(impact)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting || impact === null}
          >
            {submitting ? "Dropping…" : "Drop course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
