"use client";

import dynamic from "next/dynamic";

import type { NextAssignmentDTO } from "@/lib/calendar/queries";

// Grouping/formatting here depends on the browser's local timezone (see
// NextAssignmentWidget), which the server doesn't share — ssr: false avoids the
// server/client text mismatch that would otherwise cause a hydration error.
const NextAssignmentWidget = dynamic(
  () => import("@/components/dashboard/NextAssignmentWidget").then((m) => m.NextAssignmentWidget),
  { ssr: false },
);

export function NextAssignmentWidgetClient({ items }: { items: NextAssignmentDTO[] }) {
  return <NextAssignmentWidget items={items} />;
}
