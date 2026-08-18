"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import { useState } from "react";

export interface MiniCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  courseColor: string | null;
}

export function MiniCalendarWidget({
  title,
  events,
}: {
  title: string;
  events: MiniCalendarEvent[];
}) {
  const [initialView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "listWeek" : "dayGridMonth",
  );

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
    <div className="flex h-full flex-col gap-2">
      <div className="rounded-xl border border-border bg-card px-4 py-2.5">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex-1 rounded-xl border border-border bg-card p-2 [&_.fc]:text-xs">
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin]}
          initialView={initialView}
          headerToolbar={{ left: "prev,next", center: "title", right: "" }}
          height="auto"
          events={fcEvents}
        />
      </div>
    </div>
  );
}
