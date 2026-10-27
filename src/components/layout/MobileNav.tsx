"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis } from "lucide-react";

import { MORE_SECTIONS, PHONE_TABS, isMoreActive, isNavActive } from "./nav";

const tabClass = (active: boolean) =>
  `relative flex flex-1 flex-col items-center gap-1 px-0.5 pt-2 pb-1.5 text-[11px] leading-none font-medium ${
    active ? "text-highlight" : "text-muted-foreground"
  }`;

/**
 * Phone navigation: a bottom tab bar with four sections plus a "More" tab that opens the
 * remaining sections. Hidden from the md breakpoint up, where the Sidebar takes over.
 */
export function MobileNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const close = () => setMoreOpen(false);

  return (
    <div className="md:hidden">
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-20 bg-background/60"
            onClick={close}
          />
          <nav
            id="more-sections"
            aria-label="More sections"
            className="fixed inset-x-3 z-30 flex flex-col gap-1 rounded-xl border border-border bg-popover p-2 shadow-lg"
            style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
          >
            {MORE_SECTIONS.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="size-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sidebar-border bg-sidebar pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
      >
        {PHONE_TABS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          const badge = item.href === "/notifications" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={active ? "page" : undefined}
              className={tabClass(active)}
            >
              <span className="relative">
                <Icon className="size-5" />
                {badge && (
                  <span
                    className="absolute -top-1.5 left-3 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-primary-foreground"
                    aria-label={`${unreadCount} unread`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="more-sections"
          onClick={() => setMoreOpen((open) => !open)}
          className={tabClass(moreOpen || isMoreActive(pathname))}
        >
          <Ellipsis className="size-5" />
          <span className="w-full truncate text-center">More</span>
        </button>
      </nav>
    </div>
  );
}
