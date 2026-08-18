"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { deleteCourse, updateCourse } from "@/server-actions/course-actions";

import type { CourseScheduleDTO } from "./types";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
];

interface CourseEditFormValues {
  name: string;
  code: string;
  location: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

const emptyValues: CourseEditFormValues = {
  name: "",
  code: "",
  location: "",
  daysOfWeek: [],
  startTime: "09:00",
  endTime: "10:00",
};

function toValues(course: CourseScheduleDTO): CourseEditFormValues {
  return {
    name: course.name,
    code: course.code ?? "",
    location: course.location ?? "",
    daysOfWeek: course.daysOfWeek,
    startTime: course.startTime,
    endTime: course.endTime,
  };
}

interface CourseEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseScheduleDTO | null;
  onSaved: () => void;
}

export function CourseEditForm({ open, onOpenChange, course, onSaved }: CourseEditFormProps) {
  const [values, setValues] = useState<CourseEditFormValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset local state each time the dialog transitions from closed to open,
  // picking up whichever course was just clicked.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && course) {
      setValues(toValues(course));
      setError(null);
    }
  }

  function toggleDay(value: number, checked: boolean) {
    setValues((prev) => ({
      ...prev,
      daysOfWeek: checked
        ? [...prev.daysOfWeek, value].sort()
        : prev.daysOfWeek.filter((d) => d !== value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;
    if (!values.name.trim() || values.daysOfWeek.length === 0) {
      setError("Enter a course name and pick at least one day.");
      return;
    }
    if (values.endTime <= values.startTime) {
      setError("End time must be after start time.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateCourse(course.id, {
        name: values.name,
        code: values.code || null,
        location: values.location || null,
        daysOfWeek: values.daysOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!course) return;
    if (!confirm("Remove this course? This also removes it from any assignments.")) return;
    setSubmitting(true);
    try {
      await deleteCourse(course.id);
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
          <DialogTitle>Edit course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-course-name">Course name</Label>
            <Input
              id="edit-course-name"
              required
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-course-code">Code (optional)</Label>
            <Input
              id="edit-course-code"
              value={values.code}
              onChange={(e) => setValues({ ...values, code: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-course-location">Location</Label>
            <Input
              id="edit-course-location"
              value={values.location}
              onChange={(e) => setValues({ ...values, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-course-start-hours">Start time</Label>
              <TimeInput
                id="edit-course-start"
                required
                value={values.startTime}
                onChange={(startTime) => setValues({ ...values, startTime })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-course-end-hours">End time</Label>
              <TimeInput
                id="edit-course-end"
                required
                value={values.endTime}
                onChange={(endTime) => setValues({ ...values, endTime })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">Days</span>
            {DAYS.map((day) => (
              <div key={day.value} className="flex items-center gap-1.5">
                <Checkbox
                  id={`edit-day-${day.value}`}
                  checked={values.daysOfWeek.includes(day.value)}
                  onCheckedChange={(checked) => toggleDay(day.value, checked === true)}
                />
                <Label htmlFor={`edit-day-${day.value}`}>{day.label}</Label>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex items-center gap-2 sm:justify-between">
            <Button type="button" variant="destructive" disabled={submitting} onClick={handleDelete}>
              Delete
            </Button>
            <Button type="submit" disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
