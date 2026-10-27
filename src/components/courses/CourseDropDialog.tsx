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
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
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
              : `This permanently deletes the course and ${plural(impact.assignments, "assignment")}. This cannot be undone.`}
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
