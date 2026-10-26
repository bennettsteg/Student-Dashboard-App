import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only needed for the phone tab bar's Notifications badge. Microsoft connection status
  // and sign-out live in Settings.
  const userId = await resolveUserId();
  const unreadCount = await prisma.notificationItem.count({
    where: { userId, source: "EMAIL", isRead: false },
  });

  return (
    <div className="flex flex-1 min-w-0">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-10 md:pt-9 md:pb-10">
        {children}
      </main>
      <MobileNav unreadCount={unreadCount} />
    </div>
  );
}
