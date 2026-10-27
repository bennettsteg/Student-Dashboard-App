"use client";

import Link from "next/link";
import { useState } from "react";

import { CompleteAssignmentDialog } from "@/components/assignments/CompleteAssignmentDialog";
import { StatusBadge } from "@/components/assignments/StatusBadge";
import { Button } from "@/components/ui/button";
import type { AssignmentStatus } from "@/lib/assignments/status";

export interface NextDueItem {
  id: string;
  title: string;
  courseName: string;
  /** Already formatted in the student's profile timezone, e.g. "Tue, Oct 27". */
  dueLabel: string;
  status: AssignmentStatus;
}

/** The next-due open Assignments, each with Complete (behind the same confirm as Assignments). */
export function NextDuePanel({ items }: { items: NextDueItem[] }) {
  const [completing, setCompleting] = useState<NextDueItem | null>(null);

  return (
    <section className="rounded-xl border border-border bg-card" aria-labelledby="next-due-heading">
      <header className="flex items-center justify-between px-5 pt-5 pb-3 md:px-6">
        <h2 id="next-due-heading" className="text-xl font-bold">
          Assignments
        </h2>
        <Link href="/assignments" className="text-sm font-semibold text-highlight hover:underline">
          View all
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground md:px-6">
          Nothing is due. You&apos;re all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{item.title}</p>
                <p className="truncate text-sm text-muted-foreground">{item.courseName}</p>
                {/* Phones: the date and badge sit under the course to leave room for Complete. */}
                <div className="mt-1 flex items-center gap-2 md:hidden">
                  <span className="text-sm text-muted-foreground">{item.dueLabel}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-3 md:flex">
                <span className="text-sm text-muted-foreground">{item.dueLabel}</span>
                <StatusBadge status={item.status} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="shrink-0 px-4"
                aria-label={`Complete ${item.title}`}
                onClick={() => setCompleting(item)}
              >
                Complete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <CompleteAssignmentDialog assignment={completing} onClose={() => setCompleting(null)} />
    </section>
  );
}
