"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCourse } from "@/server-actions/course-actions";

export function CourseForm() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createCourse({ name, code: code || null });
      setName("");
      setCode("");
      formRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="course-name">
          Course name
        </label>
        <Input
          id="course-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Intro to Algorithms"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="course-code">
          Code (optional)
        </label>
        <Input
          id="course-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CS 201"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        Add course
      </Button>
    </form>
  );
}
