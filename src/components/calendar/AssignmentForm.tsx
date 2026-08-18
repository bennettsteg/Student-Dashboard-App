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
import { TimeInput } from "@/components/ui/time-input";
import { createEvent, deleteEvent, updateEvent } from "@/server-actions/calendar-actions";

import type { CourseOption } from "@/components/calendar/EventForm";

export interface AssignmentFormValues {
  id?: string;
  title: string;
  courseId: string;
  day: string; // YYYY-MM-DD
  time: string; // HH:mm
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

const NO_COURSE = "none";
const DUE_DURATION_MS = 15 * 60 * 1000;

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
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset local state each time the dialog transitions from closed to open,
  // picking up the latest initialValues (id alone can't detect "new" vs "new").
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValues(initialValues);
  }

  const isEdit = Boolean(initialValues.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dueAt = `${values.day}T${values.time}`;
      const end = new Date(new Date(dueAt).getTime() + DUE_DURATION_MS);
      const input = {
        title: values.title,
        description: null,
        location: null,
        start: dueAt,
        end: end.toISOString(),
        allDay: false,
        courseId: lockedCourseId ?? (values.courseId === NO_COURSE ? null : values.courseId),
        isAssignment: true,
        dueAt,
      };
      if (isEdit && initialValues.id) {
        await updateEvent(initialValues.id, input);
      } else {
        await createEvent(input);
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
      await deleteEvent(initialValues.id);
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
                value={values.courseId || NO_COURSE}
                onValueChange={(courseId) =>
                  setValues({ ...values, courseId: courseId ?? NO_COURSE })
                }
              >
                <SelectTrigger id="assignment-course" className="w-full">
                  <SelectValue placeholder="No course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COURSE}>No course</SelectItem>
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
