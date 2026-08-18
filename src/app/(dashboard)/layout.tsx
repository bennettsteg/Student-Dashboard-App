import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await resolveUserId();
  if (!userId) {
    redirect("/signin");
  }
  // Real NextAuth session, if any — only used here for the header's display label.
  // Under AUTH_DEV_BYPASS this is null even though userId above is set.
  const session = await auth();

  return (
    <div className="flex flex-1 min-w-0">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="font-semibold">Student Dashboard</span>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden truncate sm:inline">
              {session?.user?.email ?? session?.user?.name ?? "Dev mode"}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button
                type="submit"
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
