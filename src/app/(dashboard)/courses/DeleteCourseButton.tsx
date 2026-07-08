"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteCourse } from "@/server-actions/course-actions";

export function DeleteCourseButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await deleteCourse(id);
        } finally {
          setPending(false);
        }
      }}
    >
      Remove
    </Button>
  );
}
