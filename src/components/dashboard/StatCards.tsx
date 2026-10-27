function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-4xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

/** The three Dashboard summary cards. Text arrives pre-formatted in the profile timezone. */
export function StatCards({
  dueThisWeek,
  nextDueLabel,
  openCount,
  courseCount,
  unreadCount,
}: {
  dueThisWeek: number;
  /** Formatted next due date, or null when nothing upcoming is due. */
  nextDueLabel: string | null;
  openCount: number;
  courseCount: number;
  unreadCount: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Due this week"
        value={dueThisWeek}
        detail={nextDueLabel ? `Next: ${nextDueLabel}` : "Nothing upcoming"}
      />
      <StatCard
        label="Open assignments"
        value={openCount}
        detail={`Across ${courseCount} ${courseCount === 1 ? "course" : "courses"}`}
      />
      <StatCard
        label="Unread notifications"
        value={unreadCount}
        detail={unreadCount === 0 ? "All caught up" : "In your inbox"}
      />
    </div>
  );
}
