"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import type {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EventForm, type CourseOption, type EventFormValues } from "@/components/calendar/EventForm";
import { AssignmentForm, type AssignmentFormValues } from "@/components/calendar/AssignmentForm";
import { moveEvent } from "@/server-actions/calendar-actions";
import { toDateValue, toDatetimeLocalValue, toTimeValue } from "@/lib/dates";

export interface CalendarEventDTO {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  courseId: string | null;
  courseColor: string | null;
  isAssignment: boolean;
  dueAt: string | null;
  description: string | null;
  location: string | null;
  source: "MANUAL" | "BLACKBOARD_ICS";
}

const emptyForm: EventFormValues = {
  title: "",
  description: "",
  location: "",
  start: "",
  end: "",
  allDay: false,
  courseId: "none",
};

const emptyAssignmentForm: AssignmentFormValues = {
  title: "",
  courseId: "none",
  day: "",
  time: "",
};

export function CalendarView({
  events,
  courses,
}: {
  events: CalendarEventDTO[];
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<EventFormValues>(emptyForm);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [assignmentFormValues, setAssignmentFormValues] =
    useState<AssignmentFormValues>(emptyAssignmentForm);
  const [isMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const initialView = isMobile ? "listWeek" : "dayGridMonth";

  const fcEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        backgroundColor: event.courseColor ?? undefined,
        borderColor: event.courseColor ?? undefined,
        extendedProps: { source: event.source, isAssignment: event.isAssignment },
      })),
    [events],
  );

  function openCreateForm(start: Date, end: Date, allDay: boolean) {
    setFormValues({
      ...emptyForm,
      start: toDatetimeLocalValue(start),
      end: toDatetimeLocalValue(end),
      allDay,
    });
    setFormOpen(true);
  }

  function openEditForm(eventId: string) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    if (event.isAssignment) {
      const due = new Date(event.dueAt ?? event.start);
      setAssignmentFormValues({
        id: event.id,
        title: event.title,
        courseId: event.courseId ?? "none",
        day: toDateValue(due),
        time: toTimeValue(due),
      });
      setAssignmentFormOpen(true);
      return;
    }

    setFormValues({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      start: toDatetimeLocalValue(new Date(event.start)),
      end: toDatetimeLocalValue(new Date(event.end)),
      allDay: event.allDay,
      courseId: event.courseId ?? "none",
    });
    setFormOpen(true);
  }

  function openCreateAssignmentForm() {
    const now = new Date();
    setAssignmentFormValues({
      ...emptyAssignmentForm,
      day: toDateValue(now),
      time: toTimeValue(now),
    });
    setAssignmentFormOpen(true);
  }

  function handleSelect(arg: DateSelectArg) {
    openCreateForm(arg.start, arg.end, arg.allDay);
  }

  function handleEventClick(arg: EventClickArg) {
    openEditForm(arg.event.id);
  }

  async function handleEventDrop(arg: EventDropArg) {
    const { event, revert } = arg;
    if (!event.start || !event.end) {
      revert();
      return;
    }
    try {
      await moveEvent(event.id, event.start.toISOString(), event.end.toISOString());
      router.refresh();
    } catch {
      revert();
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-2 [&_.fc]:text-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={
          isMobile
            ? { left: "prev,next", center: "title", right: "" }
            : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" }
        }
        height="auto"
        selectable
        editable
        events={fcEvents}
        select={handleSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventContent={renderEventContent}
      />
      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        courses={courses}
        initialValues={formValues}
        onSaved={() => router.refresh()}
      />
      <AssignmentForm
        open={assignmentFormOpen}
        onOpenChange={setAssignmentFormOpen}
        courses={courses}
        initialValues={assignmentFormValues}
        onSaved={() => router.refresh()}
      />
      <div className="mt-2 flex justify-end gap-4">
        <button
          type="button"
          className="text-sm text-muted-foreground underline hover:text-foreground"
          onClick={openCreateAssignmentForm}
        >
          + Add assignment
        </button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline hover:text-foreground"
          onClick={() => {
            const now = new Date();
            const later = new Date(now.getTime() + 60 * 60 * 1000);
            openCreateForm(now, later, false);
          }}
        >
          + Add event
        </button>
      </div>
    </div>
  );
}

function renderEventContent(arg: EventContentArg) {
  const isAssignment = arg.event.extendedProps.isAssignment as boolean;
  return (
    <div className="flex items-center gap-1 overflow-hidden px-0.5">
      {isAssignment && <span title="Assignment">📌</span>}
      <span className="truncate">{arg.event.title}</span>
    </div>
  );
}
