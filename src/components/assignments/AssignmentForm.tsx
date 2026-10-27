"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { createAssignment, deleteAssignment, updateAssignment } from "@/server-actions/assignment-actions";

export interface CourseOption {
  id: string;
  name: string;
  color: string | null;
}

export interface AssignmentFormValues {
  id?: string;
  title: string;
  courseId: string;
  day: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes: string;
}

interface AssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseOption[];
  initialValues: AssignmentFormValues;
  onSaved: () => void;
  /** When set, the assignment is always saved under this course — the course picker is hidden. */
  lockedCourseId?: string;
}

export function AssignmentForm({
  open,
  onOpenChange,
  courses,
  initialValues,
  onSaved,
  lockedCourseId,
}: AssignmentFormProps) {
  const [values, setValues] = useState(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset local state each time the dialog transitions from closed to open,
  // picking up the latest initialValues (id alone can't detect "new" vs "new").
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setValues(initialValues);
      setError(null);
    }
  }

  const isEdit = Boolean(initialValues.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Resolve the wall-clock day/time to an absolute instant here, in the
      // browser's own timezone, before it crosses to the server — a naive
      // "YYYY-MM-DDTHH:mm" string would otherwise be re-interpreted using the
      // server's local timezone (which may differ, e.g. a UTC Docker host),
      // shifting the stored time.
      const [year, month, day] = values.day.split("-").map(Number);
      const [hours, minutes] = values.time.split(":").map(Number);
      const due = new Date(year, month - 1, day, hours, minutes);
      const courseId = lockedCourseId ?? values.courseId;
      if (!courseId) {
        setError("Choose a course.");
        return;
      }
      setError(null);
      const input = {
        title: values.title,
        notes: values.notes.trim() || null,
        courseId,
        dueAt: due.toISOString(),
      };
      if (isEdit && initialValues.id) {
        await updateAssignment(initialValues.id, input);
      } else {
        await createAssignment(input);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialValues.id) return;
    setSubmitting(true);
    try {
      await deleteAssignment(initialValues.id);
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit assignment" : "New assignment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assignment-title">Title</Label>
            <Input
              id="assignment-title"
              required
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
            />
          </div>

          {!lockedCourseId && (
            <div className="space-y-1.5">
              <Label htmlFor="assignment-course">Course</Label>
              <Select
                value={values.courseId || null}
                onValueChange={(courseId) => setValues({ ...values, courseId: courseId ?? "" })}
              >
                <SelectTrigger id="assignment-course" className="w-full">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assignment-day">Day</Label>
              <Input
                id="assignment-day"
                type="date"
                required
                value={values.day}
                onChange={(e) => setValues({ ...values, day: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignment-time-hours">Time</Label>
              <TimeInput
                id="assignment-time"
                required
                value={values.time}
                onChange={(time) => setValues({ ...values, time })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assignment-notes">Notes (optional)</Label>
            <Textarea
              id="assignment-notes"
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex items-center gap-2 sm:justify-between">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={handleDelete}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={submitting}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
