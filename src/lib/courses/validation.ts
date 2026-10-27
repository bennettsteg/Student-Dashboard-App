/**
 * Pure validation of Course input, shared by the server actions. A Course is either
 * scheduled (meeting days with a valid start and end time) or unscheduled (no days and no
 * times), such as the migrated "Unassigned (migrated)" Course. An unscheduled Course is not
 * drawn on the Schedule.
 */

import { isValidTimeOfDay } from "@/lib/profile/validation";
import { formatTimeOfDay } from "@/lib/schedule/layout";

export interface CourseInput {
  name: string;
  code?: string | null;
  instructor?: string | null;
  location?: string | null;
  /** ISO weekday numbers, 1 (Monday) to 5 (Friday). Empty for an unscheduled Course. */
  daysOfWeek: number[];
  startTime: string; // "HH:mm", or "" when unscheduled
  endTime: string; // "HH:mm", or "" when unscheduled
}

export interface ParsedCourse {
  name: string;
  code: string | null;
  instructor: string | null;
  location: string | null;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

export type ParseCourseResult = { ok: true; value: ParsedCourse } | { ok: false; error: string };

// ISO weekday number -> label (1 = Monday ... 5 = Friday).
const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cleanText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function parseCourseInput(input: CourseInput): ParseCourseResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Enter a course name." };

  if (!input.daysOfWeek.every((day) => Number.isInteger(day) && day >= 1 && day <= 5)) {
    return { ok: false, error: "Meeting days must be Monday to Friday." };
  }
  const daysOfWeek = [...new Set(input.daysOfWeek)].sort((a, b) => a - b);

  let startTime = "";
  let endTime = "";
  if (daysOfWeek.length > 0) {
    if (!isValidTimeOfDay(input.startTime) || !isValidTimeOfDay(input.endTime)) {
      return { ok: false, error: "Enter a start and end time for the meeting days." };
    }
    // Both zero-padded "HH:mm", so string order is time order.
    if (input.endTime <= input.startTime) {
      return { ok: false, error: "End time must be after start time." };
    }
    startTime = input.startTime;
    endTime = input.endTime;
  }

  return {
    ok: true,
    value: {
      name,
      code: cleanText(input.code),
      instructor: cleanText(input.instructor),
      location: cleanText(input.location),
      daysOfWeek,
      startTime,
      endTime,
    },
  };
}

/** "Tue / Thu, 9:30 AM" for a scheduled Course, or null for an unscheduled one. */
export function meetingSummary(daysOfWeek: number[], startTime: string): string | null {
  if (daysOfWeek.length === 0 || !startTime) return null;
  return `${daysOfWeek.map((d) => DAY_ABBREVIATIONS[d]).join(" / ")}, ${formatTimeOfDay(startTime)}`;
}
