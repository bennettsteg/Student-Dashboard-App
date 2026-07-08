import ical, { type CalendarResponse, type ParameterValue, type VEvent } from "node-ical";

export interface NormalizedEvent {
  uid: string;
  /** "" for a non-recurring event, otherwise the occurrence's start ISO string. */
  recurrenceId: string;
  title: string;
  courseName: string | null;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  isAssignment: boolean;
  dueAt: Date | null;
}

const ASSIGNMENT_KEYWORDS = [
  "assignment",
  "due",
  "homework",
  "quiz",
  "exam",
  "test",
  "project",
  "paper",
  "submission",
];

function textValue(value: ParameterValue | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.val ?? null;
}

/** Blackboard calendar feeds commonly prefix event titles with "Course Name: Event Title". */
function splitCourseAndTitle(summary: string): { courseName: string | null; title: string } {
  const separatorIndex = summary.indexOf(": ");
  if (separatorIndex === -1) {
    return { courseName: null, title: summary };
  }
  return {
    courseName: summary.slice(0, separatorIndex).trim(),
    title: summary.slice(separatorIndex + 2).trim(),
  };
}

function looksLikeAssignment(title: string): boolean {
  const lower = title.toLowerCase();
  return ASSIGNMENT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function parseIcsFeed(
  response: CalendarResponse,
  window: { from: Date; to: Date },
): NormalizedEvent[] {
  const results: NormalizedEvent[] = [];

  for (const component of Object.values(response)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    if (event.status === "CANCELLED") continue;

    const summary = textValue(event.summary) ?? "Untitled event";
    const description = textValue(event.description);
    const location = textValue(event.location);
    const { courseName, title } = splitCourseAndTitle(summary);
    const isAssignment = looksLikeAssignment(title);

    if (event.rrule) {
      const instances = ical.expandRecurringEvent(event, window);
      for (const instance of instances) {
        results.push({
          uid: event.uid,
          recurrenceId: instance.start.toISOString(),
          title,
          courseName,
          description,
          location,
          start: instance.start,
          end: instance.end,
          allDay: instance.isFullDay,
          isAssignment,
          dueAt: isAssignment ? instance.end : null,
        });
      }
      continue;
    }

    if (!event.start || !event.end) continue;
    if (event.start > window.to || event.end < window.from) continue;

    results.push({
      uid: event.uid,
      recurrenceId: "",
      title,
      courseName,
      description,
      location,
      start: event.start,
      end: event.end,
      allDay: Boolean(event.start.dateOnly),
      isAssignment,
      dueAt: isAssignment ? event.end : null,
    });
  }

  return results;
}
