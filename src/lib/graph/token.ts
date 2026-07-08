import { prisma } from "@/lib/db";

const REFRESH_MARGIN_SECONDS = 300;

interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/** Returns a valid Graph access token for the user, refreshing it first if it's near expiry. */
export async function getValidAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
  });
  if (!account?.access_token) {
    throw new Error("No linked Microsoft account for this user");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = account.expires_at ?? 0;
  if (expiresAt - nowSeconds > REFRESH_MARGIN_SECONDS) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new Error("Microsoft account has no refresh token; sign in again");
  }

  const params = new URLSearchParams({
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
    client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Microsoft token: ${res.status} ${await res.text()}`);
  }

  const data: TokenRefreshResponse = await res.json();

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? account.refresh_token,
      expires_at: nowSeconds + data.expires_in,
    },
  });

  return data.access_token;
}
