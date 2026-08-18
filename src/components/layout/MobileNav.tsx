"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Calendar, ClipboardList, Clock, LayoutDashboard, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/schedule", label: "Schedule", icon: Clock },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/notifications", label: "Mail", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-sidebar-border bg-sidebar md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[11px] leading-none ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="w-full truncate text-center">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
