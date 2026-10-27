"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  searchDashboard,
  type SearchableAssignment,
  type SearchableCourse,
} from "@/lib/dashboard/search";

/**
 * Header search: type to filter Assignments and Courses by name, then pick a result (click, or
 * arrow keys and Enter) to navigate to it. Filtering is the pure `searchDashboard` over the
 * lists the Dashboard already loaded, so results appear instantly.
 */
export function HeaderSearch({
  assignments,
  courses,
}: {
  assignments: SearchableAssignment[];
  courses: SearchableCourse[];
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => searchDashboard(query, assignments, courses),
    [query, assignments, courses],
  );
  const showList = open && query.trim() !== "";
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      const result = results[activeIndex];
      if (result) {
        e.preventDefault();
        go(result.href);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 flex-1 md:w-72 md:flex-none"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        role="combobox"
        aria-label="Search assignments and courses"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search assignments, courses"
        value={query}
        className="h-10 border-border bg-card pl-9"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
          ) : (
            results.map((result, i) => (
              <li
                key={`${result.kind}-${result.id}`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={`flex w-full flex-col rounded-lg px-3 py-2 text-left ${
                    i === activeIndex ? "bg-accent" : "hover:bg-accent"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  // mousedown (not click) so the input's blur does not close the list first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(result.href);
                  }}
                >
                  <span className="truncate text-sm font-semibold">{result.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{result.subtitle}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
