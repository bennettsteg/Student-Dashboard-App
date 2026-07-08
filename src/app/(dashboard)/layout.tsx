import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden truncate sm:inline">
              {session.user?.email ?? session.user?.name}
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
        <main className="flex flex-1 flex-col p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
