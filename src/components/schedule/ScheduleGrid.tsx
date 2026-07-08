"use client";

import { X } from "lucide-react";

import { deleteScheduleClass } from "@/server-actions/schedule-actions";

export interface ScheduleClassDTO {
  id: string;
  name: string;
  location: string | null;
  daysOfWeek: number[];
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  color: string | null;
}

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const HOUR_START = 7; // 7 AM
const HOUR_END = 22; // 10 PM
const HOURS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i,
);
const ROW_HEIGHT = 48; // px per hour
const GRID_HEIGHT = (HOUR_END - HOUR_START) * ROW_HEIGHT;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  const period = hour < 12 || hour === 24 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

export function ScheduleGrid({ classes }: { classes: ScheduleClassDTO[] }) {
  async function handleDelete(id: string) {
    if (!confirm("Remove this class from your schedule?")) return;
    await deleteScheduleClass(id);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[640px]">
        <div className="grid" style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}>
          <div />
          {DAYS.map((day) => (
            <div
              key={day.value}
              className="border-l border-border py-2 text-center text-sm font-medium"
            >
              {day.label}
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}>
          <div className="relative" style={{ height: GRID_HEIGHT }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                style={{ top: (hour - HOUR_START) * ROW_HEIGHT }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>
          {DAYS.map((day) => (
            <div
              key={day.value}
              className="relative border-l border-border"
              style={{ height: GRID_HEIGHT }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{ top: (hour - HOUR_START) * ROW_HEIGHT }}
                />
              ))}
              {classes
                .filter((cls) => cls.daysOfWeek.includes(day.value))
                .map((cls) => {
                  const startMin = Math.max(
                    timeToMinutes(cls.startTime),
                    HOUR_START * 60,
                  );
                  const endMin = Math.min(timeToMinutes(cls.endTime), HOUR_END * 60);
                  const top = ((startMin - HOUR_START * 60) / 60) * ROW_HEIGHT;
                  const height = Math.max(
                    ((endMin - startMin) / 60) * ROW_HEIGHT,
                    20,
                  );
                  return (
                    <div
                      key={cls.id}
                      className="group absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-xs text-white"
                      style={{ top, height, backgroundColor: cls.color ?? "#9e1b32" }}
                    >
                      <button
                        type="button"
                        onClick={() => handleDelete(cls.id)}
                        className="absolute right-1 top-1 hidden rounded-sm bg-black/20 p-0.5 hover:bg-black/40 group-hover:block"
                        aria-label={`Remove ${cls.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="truncate pr-4 font-medium">{cls.name}</div>
                      {cls.location && (
                        <div className="truncate opacity-90">{cls.location}</div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
