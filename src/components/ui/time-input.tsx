"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";

export interface TimeInputProps {
  id?: string;
  value: string; // 24-hour "HH:mm"
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseTime(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(":").map(Number);
  return {
    hours: Number.isFinite(h) ? h : 0,
    minutes: Number.isFinite(m) ? m : 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * 24-hour ("military time") time input: two numeric steppers (hours 0-23, minutes 0-59)
 * instead of the browser's native time input, whose displayed format (12h/24h) depends
 * on locale rather than being consistently 24-hour.
 */
export function TimeInput({ id, value, onChange, required, disabled }: TimeInputProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const { hours, minutes } = parseTime(value);

  function commitHours(raw: string) {
    if (raw === "") return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange(`${pad(clamp(Math.trunc(parsed), 0, 23))}:${pad(minutes)}`);
  }

  function commitMinutes(raw: string) {
    if (raw === "") return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange(`${pad(hours)}:${pad(clamp(Math.trunc(parsed), 0, 59))}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        id={`${baseId}-hours`}
        type="number"
        inputMode="numeric"
        min={0}
        max={23}
        step={1}
        required={required}
        disabled={disabled}
        value={pad(hours)}
        onChange={(e) => commitHours(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="w-16 text-center"
        aria-label="Hours (0-23)"
      />
      <span className="text-muted-foreground" aria-hidden>
        :
      </span>
      <Input
        id={`${baseId}-minutes`}
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        step={1}
        required={required}
        disabled={disabled}
        value={pad(minutes)}
        onChange={(e) => commitMinutes(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="w-16 text-center"
        aria-label="Minutes (0-59)"
      />
    </div>
  );
}
