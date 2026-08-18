"use client";

import dynamic from "next/dynamic";

import type { MiniCalendarEvent } from "@/components/dashboard/MiniCalendarWidget";

const MiniCalendarWidget = dynamic(
  () => import("@/components/dashboard/MiniCalendarWidget").then((m) => m.MiniCalendarWidget),
  { ssr: false },
);

export function MiniCalendarWidgetClient({
  title,
  events,
}: {
  title: string;
  events: MiniCalendarEvent[];
}) {
  return <MiniCalendarWidget title={title} events={events} />;
}
