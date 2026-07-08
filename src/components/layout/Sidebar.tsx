"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Calendar, Clock, LayoutDashboard, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/schedule", label: "Schedule", icon: Clock },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="font-semibold text-sidebar-foreground">Student Dashboard</span>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
