/**
 * Schedule grid geometry. Pure: Course meeting times are "HH:mm" wall-clock strings, and the
 * grid is a fixed Monday-Friday, 7 AM-10 PM week, so nothing here needs a date or timezone.
 */

export const SCHEDULE_START_HOUR = 7; // 7 AM
export const SCHEDULE_END_HOUR = 22; // 10 PM

/** Shortest block drawn, so a very short class stays readable. */
const MIN_BLOCK_HEIGHT = 20;

export interface Placement {
  top: number;
  height: number;
}

export interface MeetingTime {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface DayBlock extends Placement {
  id: string;
  /** Zero-based column within a group of overlapping classes. */
  column: number;
  /** How many columns the overlapping group is split into (1 = full width). */
  columns: number;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface Span {
  id: string;
  start: number;
  end: number;
}

/** Clips a meeting to the visible 7 AM-10 PM window, or null when nothing of it is visible. */
function clip(startTime: string, endTime: string): { start: number; end: number } | null {
  const start = Math.max(toMinutes(startTime), SCHEDULE_START_HOUR * 60);
  const end = Math.min(toMinutes(endTime), SCHEDULE_END_HOUR * 60);
  if (!(end > start)) return null;
  return { start, end };
}

function toPlacement(start: number, end: number, pxPerHour: number): Placement {
  return {
    top: ((start - SCHEDULE_START_HOUR * 60) / 60) * pxPerHour,
    height: Math.max(((end - start) / 60) * pxPerHour, MIN_BLOCK_HEIGHT),
  };
}

/** Vertical position of one meeting, in pixels from the top of the 7 AM row. */
export function placeBlock(startTime: string, endTime: string, pxPerHour: number): Placement | null {
  const span = clip(startTime, endTime);
  return span ? toPlacement(span.start, span.end, pxPerHour) : null;
}

/**
 * Places every meeting of one weekday. Meetings that overlap in time are split into
 * side-by-side columns instead of being drawn on top of each other; meetings that merely
 * touch (one ends as the next starts) are not overlapping.
 */
export function layoutDay(meetings: MeetingTime[], pxPerHour: number): DayBlock[] {
  const spans: Span[] = [];
  for (const meeting of meetings) {
    const span = clip(meeting.startTime, meeting.endTime);
    if (span) spans.push({ id: meeting.id, ...span });
  }
  spans.sort((a, b) => a.start - b.start || a.end - b.end);

  const blocks: DayBlock[] = [];
  let cluster: { span: Span; column: number }[] = [];
  let clusterEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    const columns = Math.max(columnEnds.length, 1);
    for (const { span, column } of cluster) {
      blocks.push({
        id: span.id,
        ...toPlacement(span.start, span.end, pxPerHour),
        column,
        columns,
      });
    }
    cluster = [];
    columnEnds = [];
  };

  for (const span of spans) {
    if (cluster.length > 0 && span.start >= clusterEnd) flush();
    let column = columnEnds.findIndex((end) => end <= span.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(span.end);
    } else {
      columnEnds[column] = span.end;
    }
    cluster.push({ span, column });
    clusterEnd = cluster.length === 1 ? span.end : Math.max(clusterEnd, span.end);
  }
  flush();

  return blocks;
}

/** "7 AM", "12 PM", "1 PM" for a whole hour on the grid's time axis. */
export function formatHourLabel(hour: number): string {
  const period = hour < 12 || hour === 24 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

/** "9:05 AM" for an "HH:mm" meeting time. */
export function formatTimeOfDay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${period}`;
}
