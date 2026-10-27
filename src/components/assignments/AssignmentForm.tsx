"use client";

import Link from "next/link";
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
import { zonedTimeToInstant } from "@/lib/time";
import { createAssignment, updateAssignment } from "@/server-actions/assignment-actions";

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
  /** The student's IANA timezone (`User.timezone`): the due day and time are read in it. */
  timeZone: string;
  /** True while the timezone is still the untouched default, so Settings is worth a nudge. */
  showTimeZoneHint?: boolean;
  onSaved: () => void;
}

/**
 * The one add/edit form for an Assignment. Complete (delete) is deliberately not here: it
 * lives on the list rows behind a confirmation.
 */
export function AssignmentForm({
  open,
  onOpenChange,
  courses,
  initialValues,
  timeZone,
  showTimeZoneHint = false,
  onSaved,
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
    if (!values.courseId) {
      setError("Choose a course.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Resolve the wall-clock day/time to an absolute instant here, in the student's
      // profile timezone (not the browser's or the server's), before it crosses to the
      // server, so a due time means the same thing on every device.
      const due = zonedTimeToInstant(values.day, values.time, timeZone);
      const input = {
        title: values.title,
        notes: values.notes.trim() || null,
        courseId: values.courseId,
        dueAt: due.toISOString(),
      };
      if (isEdit && initialValues.id) {
        await updateAssignment(initialValues.id, input);
      } else {
        await createAssignment(input);
      }
      onSaved();
      onOpenChange(false);
    } catch {
      setError("Couldn't save this assignment. Check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit assignment" : "Add assignment"}</DialogTitle>
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

          <div className="space-y-1.5">
            <Label htmlFor="assignment-course">Course</Label>
            <Select
              value={values.courseId || null}
              items={courses.map((course) => ({ value: course.id, label: course.name }))}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assignment-day">Due date</Label>
              <Input
                id="assignment-day"
                type="date"
                required
                value={values.day}
                onChange={(e) => setValues({ ...values, day: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignment-time-hours">Due time</Label>
              <TimeInput
                id="assignment-time"
                required
                value={values.time}
                onChange={(time) => setValues({ ...values, time })}
              />
            </div>
          </div>

          <p className="-mt-1 text-xs text-muted-foreground">
            Times are in {timeZone}.
            {showTimeZoneHint && (
              <>
                {" "}
                Not your timezone?{" "}
                <Link href="/settings" className="text-highlight underline hover:text-foreground">
                  Set it in Settings
                </Link>
                .
              </>
            )}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="assignment-notes">Notes (optional)</Label>
            <Textarea
              id="assignment-notes"
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {isEdit ? "Save" : "Add assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
