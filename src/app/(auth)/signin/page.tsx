import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";

import { auth, signIn } from "@/lib/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <UserRound className="h-9 w-9 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Student Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your Microsoft account to continue.
            </p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}
