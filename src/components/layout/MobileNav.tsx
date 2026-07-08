"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Calendar, Clock, LayoutDashboard, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/schedule", label: "Schedule", icon: Clock },
  { href: "/notifications", label: "Mail", icon: Bell },
  { href: "/courses", label: "Courses", icon: BookOpen },
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
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
