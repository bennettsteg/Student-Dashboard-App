import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Link2,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface NavSection {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown as its own tab in the phone bottom bar; otherwise it lives behind "More". */
  phoneTab: boolean;
}

/** The app's eight sections, in sidebar order. */
export const NAV_SECTIONS: readonly NavSection[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, phoneTab: true },
  { href: "/assignments", label: "Assignments", icon: ClipboardList, phoneTab: true },
  { href: "/courses", label: "Courses", icon: BookOpen, phoneTab: true },
  { href: "/schedule", label: "Schedule", icon: Clock, phoneTab: false },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, phoneTab: false },
  { href: "/notifications", label: "Notifications", icon: Bell, phoneTab: true },
  { href: "/links", label: "Links", icon: Link2, phoneTab: false },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal, phoneTab: false },
];

export const PHONE_TABS = NAV_SECTIONS.filter((s) => s.phoneTab);
export const MORE_SECTIONS = NAV_SECTIONS.filter((s) => !s.phoneTab);

/** True when `href`'s section should be highlighted for the current `pathname`. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True when the current page is one of the sections behind the phone "More" tab. */
export function isMoreActive(pathname: string): boolean {
  return MORE_SECTIONS.some((s) => isNavActive(pathname, s.href));
}
