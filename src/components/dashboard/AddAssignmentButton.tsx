"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AssignmentForm,
  type AssignmentFormValues,
  type CourseOption,
} from "@/components/assignments/AssignmentForm";
import { Button, buttonVariants } from "@/components/ui/button";
import { DEFAULT_DUE_TIME } from "@/lib/assignments/list";
import { toDateValue } from "@/lib/dates";

/**
 * "Add assignment" on the Dashboard: opens the same shared form the Assignments page uses.
 * Every Assignment needs a Course, so with none yet it points at Courses instead.
 */
export function AddAssignmentButton({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AssignmentFormValues>(blank(courses));

  if (courses.length === 0) {
    return (
      <Link href="/courses" className={buttonVariants({ size: "lg", className: "h-10 px-4" })}>
        Add a course first
      </Link>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="h-10 px-4 font-semibold"
        onClick={() => {
          // Default day is read at click time, in the browser's own clock, so it is never a
          // server-rendered value.
          setValues(blank(courses));
          setOpen(true);
        }}
      >
        Add assignment
      </Button>
      <AssignmentForm
        open={open}
        onOpenChange={setOpen}
        courses={courses}
        initialValues={values}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

function blank(courses: CourseOption[]): AssignmentFormValues {
  return {
    title: "",
    courseId: courses.length === 1 ? courses[0].id : "",
    day: toDateValue(new Date()),
    time: DEFAULT_DUE_TIME,
    notes: "",
  };
}
