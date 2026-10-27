"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { NAV_SECTIONS, isNavActive } from "./nav";

/** Desktop navigation: brand mark plus all eight sections. Hidden on phones (see MobileNav). */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-[env(safe-area-inset-top)] hidden h-[calc(100dvh-env(safe-area-inset-top))] w-58 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-3 px-7 pt-7 pb-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-4" />
        </span>
        <span className="text-lg font-bold text-foreground">StudyDesk</span>
      </div>
      <nav aria-label="Sections" className="flex flex-col gap-1 px-5">
        {NAV_SECTIONS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors ${
                active
                  ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
