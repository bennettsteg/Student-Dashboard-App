"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createScheduleClass } from "@/server-actions/schedule-actions";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
];

export function AddClassForm() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function toggleDay(value: number, checked: boolean) {
    setDays((prev) =>
      checked ? [...prev, value].sort() : prev.filter((d) => d !== value),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || days.length === 0) {
      setError("Enter a class name and pick at least one day.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createScheduleClass({
        name,
        location: location || null,
        daysOfWeek: days,
        startTime,
        endTime,
      });
      setName("");
      setLocation("");
      setDays([]);
      setStartTime("09:00");
      setEndTime("10:00");
      formRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="class-name">Class name</Label>
          <Input
            id="class-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Intro to Algorithms"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-location">Location</Label>
          <Input
            id="class-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Ferguson 201"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-start">Start time</Label>
          <Input
            id="class-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-end">End time</Label>
          <Input
            id="class-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={submitting}>
          Add class
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium">Days</span>
        {DAYS.map((day) => (
          <div key={day.value} className="flex items-center gap-1.5">
            <Checkbox
              id={`day-${day.value}`}
              checked={days.includes(day.value)}
              onCheckedChange={(checked) => toggleDay(day.value, checked === true)}
            />
            <Label htmlFor={`day-${day.value}`}>{day.label}</Label>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
