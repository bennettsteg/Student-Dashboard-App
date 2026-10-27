import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { microsoftConnectionState } from "@/lib/mail/connection";
import { getProfile } from "@/lib/profile/profile";
import { requireUserId } from "@/lib/session";

import { ProfileForm } from "./ProfileForm";
import { SyncMailControl } from "./SyncMailControl";

const CONNECTION_COPY = {
  "not-connected": { label: "Not connected", dot: "bg-destructive" },
  connected: { label: "Connected", dot: "bg-success" },
  "needs-reconnect": { label: "Needs reconnecting", dot: "bg-destructive" },
} as const;

export default async function SettingsPage() {
  const userId = await requireUserId();

  const [profile, account, syncState] = await Promise.all([
    getProfile(userId),
    prisma.account.findFirst({
      where: { userId, provider: "microsoft-entra-id" },
      select: { id: true },
    }),
    prisma.mailSyncState.findUnique({ where: { userId } }),
  ]);

  // Derived from stored state only; opening Settings never calls Microsoft.
  const connection = microsoftConnectionState({
    hasAccount: account !== null,
    needsReconnect: syncState?.needsReconnect ?? false,
  });
  const copy = CONNECTION_COPY[connection.status];

  // Sign-out lives here now that the app shell has no header. Signing out only ends the
  // browser session; the stored Account row (and so mail sync) is kept.
  // Exception to the resolveUserId() rule: auth() is only used to decide whether to show the
  // Sign out button, not to identify the user.
  const session = await auth();

  // Computed here (not in the client form) so server render and hydration see the same list.
  const timeZones = Array.from(new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]));

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile and reminder preferences
        </p>
      </div>

      <ProfileForm
        initial={{
          name: profile.name,
          program: profile.program,
          termLabel: profile.termLabel,
          timezone: profile.timezone,
          reminderTime: profile.reminderTime,
          remindersEnabled: profile.remindersEnabled,
        }}
        email={account ? profile.email : null}
        timeZones={timeZones}
      />

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Microsoft account</h2>
        <p className="flex items-center gap-2 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${copy.dot}`} />
          {copy.label}
        </p>
        {connection.status === "needs-reconnect" && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            Microsoft stopped accepting the saved sign-in, so mail can&apos;t sync and automatic
            mail sync is paused until you reconnect.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/settings" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {connection.action === "connect" ? "Connect Microsoft account" : "Reconnect Microsoft"}
            </button>
          </form>
          {session && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/settings" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Mail</h2>
        <p className="text-sm text-muted-foreground">
          Mail also syncs automatically once every 24 hours. Use Sync mail to fetch your newest
          Outlook mail now.
        </p>
        {connection.status === "needs-reconnect" && (
          <p className="text-sm text-destructive">
            Automatic sync is paused. Reconnect Microsoft above to resume it.
          </p>
        )}
        <SyncMailControl
          sync={{
            lastSuccessAt: syncState?.lastSuccessAt?.toISOString() ?? null,
            lastError: syncState?.lastError ?? null,
            needsReconnect: syncState?.needsReconnect ?? false,
          }}
        />
      </section>
    </div>
  );
}
