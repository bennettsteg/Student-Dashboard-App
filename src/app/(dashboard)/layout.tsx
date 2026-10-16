import Link from "next/link";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The dashboard itself never requires sign-in (see session.ts) — this is only used
  // for the header's connection label/action. No session just means "not connected to
  // Microsoft yet", not "not allowed in".
  const session = await auth();
  // Signing out doesn't delete the stored Account row, so the app can still reach Graph
  // without a session — base the label on the Account, not the session, to match Settings.
  const userId = await resolveUserId();
  const account = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
    select: { id: true },
  });
  const connected = Boolean(account);

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
              {session?.user?.email ?? session?.user?.name ?? (connected ? "Microsoft connected" : "Not connected")}
            </span>
            {session ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/settings"
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                {connected ? "Reconnect Microsoft" : "Connect Microsoft"}
              </Link>
            )}
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
