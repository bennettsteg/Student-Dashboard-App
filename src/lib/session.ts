import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEV_BYPASS_EMAIL = "dev@localhost";

// Auth.js forces JWT-encoded session cookies for the Credentials provider, even with a
// database-strategy config (see auth.ts) — mixing the two isn't supported by the library.
// So the local-testing bypass lives here instead, entirely outside NextAuth: when enabled,
// it skips the Microsoft sign-in flow altogether and hands back a fixed local User row.
// Gated on NODE_ENV as a safety net; docker-compose also never forwards this var into the
// deployed container, so it can't accidentally end up live in production either way.
async function getDevBypassUserId(): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.AUTH_DEV_BYPASS !== "true") return null;

  const user = await prisma.user.upsert({
    where: { email: DEV_BYPASS_EMAIL },
    update: {},
    create: { email: DEV_BYPASS_EMAIL, name: "Dev User" },
  });
  return user.id;
}

/**
 * Resolves the current user id, honoring AUTH_DEV_BYPASS. Returns null if unauthenticated.
 * A real NextAuth session always wins over the bypass — this lets you connect a real
 * Microsoft account from Settings while bypassed and have the app actually start using it
 * (Graph calls key off the real user's Account row, not the bypass user's). Sign out to
 * drop back to the bypass user.
 */
export async function resolveUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  return getDevBypassUserId();
}

/** For use in (dashboard) pages: redirects to /signin instead of throwing if the session is somehow missing. */
export async function requireUserId(): Promise<string> {
  const userId = await resolveUserId();
  if (!userId) {
    redirect("/signin");
  }
  return userId;
}
