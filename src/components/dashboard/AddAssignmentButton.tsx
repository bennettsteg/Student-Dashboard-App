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
import { localDate } from "@/lib/time";

/**
 * "Add assignment" on the Dashboard: opens the same shared form the Assignments page uses.
 * Every Assignment needs a Course, so with none yet it points at Courses instead.
 */
export function AddAssignmentButton({
  courses,
  timeZone,
  showTimeZoneHint,
}: {
  courses: CourseOption[];
  /** The student's IANA timezone (`User.timezone`). */
  timeZone: string;
  showTimeZoneHint: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AssignmentFormValues>(blank(courses, timeZone));

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
          // Default day is read at click time, as today's date in the profile timezone.
          setValues(blank(courses, timeZone));
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
        timeZone={timeZone}
        showTimeZoneHint={showTimeZoneHint}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

function blank(courses: CourseOption[], timeZone: string): AssignmentFormValues {
  return {
    title: "",
    courseId: courses.length === 1 ? courses[0].id : "",
    day: localDate(new Date(), timeZone),
    time: DEFAULT_DUE_TIME,
    notes: "",
  };
}
