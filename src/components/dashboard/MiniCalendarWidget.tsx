"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import { useRouter } from "next/navigation";

export interface MiniCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  courseColor: string | null;
}

export function MiniCalendarWidget({ events }: { events: MiniCalendarEvent[] }) {
  const router = useRouter();

  const fcEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.courseColor ?? undefined,
    borderColor: event.courseColor ?? undefined,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-2 [&_.fc]:text-xs">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: "prev,next", center: "title", right: "" }}
        height="auto"
        events={fcEvents}
        dateClick={() => router.push("/calendar")}
        eventClick={() => router.push("/calendar")}
      />
    </div>
  );
}
