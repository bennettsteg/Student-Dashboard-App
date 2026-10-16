import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Single-user, no-login-required-by-default app: viewing the dashboard never requires
// Microsoft sign-in. When there's no real NextAuth session, we fall back to the one
// local User row that holds all of this person's data — creating it on first visit if
// it doesn't exist yet. This is the same row the auth.js adapter reuses (see auth.ts)
// the first time "Connect Microsoft account" (Settings) completes, so connecting never
// orphans data that was synced/entered before the user ever signed in.
const LOCAL_USER_ID = "local-user";

// Prefer the user that already has a linked Account (the real, connected one) and break
// ties by id, so this is deterministic if an older DB still holds extra rows (e.g. the
// former dev@localhost bypass user). Creation uses a fixed id via upsert so two
// concurrent first requests can't each insert their own row.
async function getLocalUserId(): Promise<string> {
  const existing = await prisma.user.findFirst({
    orderBy: [{ accounts: { _count: "desc" } }, { id: "asc" }],
    select: { id: true },
  });
  if (existing) return existing.id;

  const user = await prisma.user.upsert({
    where: { id: LOCAL_USER_ID },
    update: {},
    create: { id: LOCAL_USER_ID },
  });
  return user.id;
}

/**
 * Resolves the current user id. Always succeeds: a real NextAuth session wins if present,
 * otherwise this is the local user. Mail sync / Graph calls still require actually
 * connecting a Microsoft account from Settings — the local user has no linked Account row.
 */
export async function resolveUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  return getLocalUserId();
}

/** Alias for resolveUserId, used in (dashboard) pages. Kept for naming clarity at call sites. */
export async function requireUserId(): Promise<string> {
  return resolveUserId();
}
