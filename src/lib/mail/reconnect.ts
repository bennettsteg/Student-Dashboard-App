import { prisma } from "@/lib/db";

const MICROSOFT_PROVIDER = "microsoft-entra-id";

/** The credential Microsoft returned from a completed OAuth sign-in. */
export interface MicrosoftSignInCredential {
  provider: string;
  providerAccountId: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

/**
 * Called after every completed Microsoft sign-in (Auth.js `signIn` event), including the
 * "Reconnect Microsoft" flow.
 *
 * Auth.js stores tokens only when it first links an account and never updates them when an
 * already-linked account signs in again, so without this a reconnect would leave the dead
 * refresh token in place. This writes the fresh credential to the existing Account row and, if
 * Mail Sync had been paused for needing a reconnect, clears that flag, the stale error and the
 * failed attempt time, so the next hourly tick can auto-sync again (ADR-0002). A healthy sync
 * state is left alone so connecting never loosens the guard against runaway Graph calls.
 */
export async function recordMicrosoftSignIn(
  userId: string,
  credential: MicrosoftSignInCredential,
): Promise<void> {
  if (credential.provider !== MICROSOFT_PROVIDER) return;

  await prisma.account.updateMany({
    where: {
      userId,
      provider: credential.provider,
      providerAccountId: credential.providerAccountId,
    },
    data: {
      ...(credential.access_token ? { access_token: credential.access_token } : {}),
      // Microsoft may omit a new refresh token; keep the stored one rather than blanking it.
      ...(credential.refresh_token ? { refresh_token: credential.refresh_token } : {}),
      ...(credential.expires_at !== undefined ? { expires_at: credential.expires_at } : {}),
      ...(credential.token_type ? { token_type: credential.token_type } : {}),
      ...(credential.scope ? { scope: credential.scope } : {}),
      ...(credential.id_token ? { id_token: credential.id_token } : {}),
    },
  });

  await prisma.mailSyncState.updateMany({
    where: { userId, needsReconnect: true },
    data: { needsReconnect: false, lastError: null, lastAttemptAt: null },
  });
}
