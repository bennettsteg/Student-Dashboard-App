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
import { createCourse, updateCourse } from "@/server-actions/course-actions";

import type { CourseCardDTO } from "./types";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
];

interface CourseFormValues {
  name: string;
  code: string;
  instructor: string;
  location: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

const emptyValues: CourseFormValues = {
  name: "",
  code: "",
  instructor: "",
  location: "",
  daysOfWeek: [],
  startTime: "09:00",
  endTime: "10:00",
};

function toValues(course: CourseCardDTO | null): CourseFormValues {
  if (!course) return emptyValues;
  return {
    name: course.name,
    code: course.code ?? "",
    instructor: course.instructor ?? "",
    location: course.location ?? "",
    daysOfWeek: course.daysOfWeek,
    startTime: course.startTime,
    endTime: course.endTime,
  };
}

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The Course being edited, or null to add a new one. */
  course: CourseCardDTO | null;
  onSaved: () => void;
}

/** The one add/edit form for Courses. Courses are managed only from the Courses section. */
export function CourseFormDialog({ open, onOpenChange, course, onSaved }: CourseFormDialogProps) {
  const [values, setValues] = useState<CourseFormValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset local state each time the dialog transitions from closed to open, picking up
  // whichever Course (or none) it was opened for.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
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
      const input = {
        name: values.name.trim(),
        code: values.code.trim() || null,
        instructor: values.instructor.trim() || null,
        location: values.location.trim() || null,
        daysOfWeek: values.daysOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
      };
      if (course) await updateCourse(course.id, input);
      else await createCourse(input);
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
          <DialogTitle>{course ? "Edit course" : "Add course"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="course-name">Course name</Label>
            <Input
              id="course-name"
              required
              value={values.name}
              placeholder="e.g. Web Applications"
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-code">Code (optional)</Label>
              <Input
                id="course-code"
                value={values.code}
                placeholder="e.g. CS 201"
                onChange={(e) => setValues({ ...values, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-instructor">Instructor</Label>
              <Input
                id="course-instructor"
                value={values.instructor}
                onChange={(e) => setValues({ ...values, instructor: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course-location">Location</Label>
            <Input
              id="course-location"
              value={values.location}
              placeholder="e.g. Ferguson 201"
              onChange={(e) => setValues({ ...values, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-start-hours">Start time</Label>
              <TimeInput
                id="course-start"
                required
                value={values.startTime}
                onChange={(startTime) => setValues({ ...values, startTime })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-end-hours">End time</Label>
              <TimeInput
                id="course-end"
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
                  id={`course-day-${day.value}`}
                  checked={values.daysOfWeek.includes(day.value)}
                  onCheckedChange={(checked) => toggleDay(day.value, checked === true)}
                />
                <Label htmlFor={`course-day-${day.value}`}>{day.label}</Label>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {course ? "Save" : "Add course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
