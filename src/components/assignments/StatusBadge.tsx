import type { AssignmentStatus } from "@/lib/assignments/status";

/**
 * The badge for a derived Assignment status. Upcoming work (more than 7 days out) has no
 * badge. Due today shares the Due soon colours; Overdue is a distinct solid destructive pill.
 */
export function StatusBadge({ status }: { status: AssignmentStatus }) {
  if (status === "upcoming") return null;

  const label = status === "overdue" ? "Overdue" : status === "due-today" ? "Due today" : "Due soon";
  const colours =
    status === "overdue"
      ? "bg-destructive text-foreground"
      : "bg-due-soon text-due-soon-foreground";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colours}`}>
      {label}
    </span>
  );
}
