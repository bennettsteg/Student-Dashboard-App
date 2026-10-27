"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Status, due-date formatting and the default due day all depend on the browser's timezone
// (see AssignmentsView); ssr: false avoids a server/client text mismatch.
const AssignmentsView = dynamic(() => import("./AssignmentsView").then((m) => m.AssignmentsView), {
  ssr: false,
});

export function AssignmentsViewClient(props: ComponentProps<typeof AssignmentsView>) {
  return <AssignmentsView {...props} />;
}
