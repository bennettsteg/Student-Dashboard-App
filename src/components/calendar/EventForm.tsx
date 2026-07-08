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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, deleteEvent, updateEvent } from "@/server-actions/calendar-actions";

export interface CourseOption {
  id: string;
  name: string;
  color: string | null;
}

export interface EventFormValues {
  id?: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  courseId: string;
}

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseOption[];
  initialValues: EventFormValues;
  onSaved: () => void;
}

const NO_COURSE = "none";

export function EventForm({
  open,
  onOpenChange,
  courses,
  initialValues,
  onSaved,
}: EventFormProps) {
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
      const input = {
        title: values.title,
        description: values.description,
        location: values.location,
        start: values.start,
        end: values.end,
        allDay: values.allDay,
        courseId: values.courseId === NO_COURSE ? null : values.courseId,
        isAssignment: false,
        dueAt: null,
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
          <DialogTitle>{isEdit ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                required
                value={values.start}
                onChange={(e) => setValues({ ...values, start: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="datetime-local"
                required
                value={values.end}
                onChange={(e) => setValues({ ...values, end: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="allDay"
              checked={values.allDay}
              onCheckedChange={(checked) =>
                setValues({ ...values, allDay: checked === true })
              }
            />
            <Label htmlFor="allDay">All day</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course">Course</Label>
            <Select
              value={values.courseId || NO_COURSE}
              onValueChange={(courseId) =>
                setValues({ ...values, courseId: courseId ?? NO_COURSE })
              }
            >
              <SelectTrigger id="course" className="w-full">
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

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={values.location}
              onChange={(e) => setValues({ ...values, location: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
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
