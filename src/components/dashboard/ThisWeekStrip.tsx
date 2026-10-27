import type { WeekDay } from "@/lib/dashboard/summary";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday to Sunday with the count of Assignments due each day; today is highlighted. */
export function ThisWeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6" aria-labelledby="week-heading">
      <h2 id="week-heading" className="text-xl font-bold">
        This week
      </h2>
      <ol className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((d) => (
          <li
            key={d.date}
            aria-current={d.isToday ? "date" : undefined}
            aria-label={`${DAY_LABELS[d.index]} ${d.day}: ${d.count} due`}
            className={`flex flex-col items-center gap-1 rounded-lg px-0.5 py-2.5 ${
              d.isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <span className="text-[11px] font-semibold">{DAY_LABELS[d.index]}</span>
            <span className="text-lg leading-none font-bold">{d.day}</span>
            <span
              className={`text-xs ${d.isToday ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              {d.count}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">
        Number under each date is assignments due.
      </p>
    </section>
  );
}
