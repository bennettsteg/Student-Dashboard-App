import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getValidAccessToken } from "@/lib/graph/token";

async function getMicrosoftConnectionStatus(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
  });
  if (!account) {
    return { connected: false, detail: "No Microsoft account linked yet." };
  }

  try {
    await getValidAccessToken(userId);
    return { connected: true, detail: `Scopes: ${account.scope ?? "unknown"}` };
  } catch (e) {
    return {
      connected: false,
      detail: e instanceof Error ? e.message : "Could not validate the Microsoft connection.",
    };
  }
}

export default async function SettingsPage() {
  const userId = await requireUserId();
  const connection = await getMicrosoftConnectionStatus(userId);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <div className="max-w-md space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Microsoft connection</h2>
        <p className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${connection.connected ? "bg-green-500" : "bg-destructive"}`}
          />
          {connection.connected ? "Connected" : "Not connected"}
        </p>
        <p className="text-sm text-muted-foreground">{connection.detail}</p>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/settings" });
          }}
        >
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            {connection.connected ? "Reconnect Microsoft account" : "Connect Microsoft account"}
          </button>
        </form>
      </div>
    </div>
  );
}
