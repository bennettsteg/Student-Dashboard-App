import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { recordMicrosoftSignIn } from "./reconnect";

// Live-database test (needs a reachable DATABASE_URL): a dedicated user with a linked Microsoft
// account whose stored credential has gone bad, created in setup and deleted in teardown.

const RUN = `${process.pid}-${Date.now()}`;
const USER_ID = `reconnect-test-${RUN}`;
const PROVIDER_ACCOUNT_ID = `acct-${RUN}`;
const ATTEMPT = new Date("2026-10-26T12:00:00.000Z");

const freshCredential = {
  provider: "microsoft-entra-id",
  providerAccountId: PROVIDER_ACCOUNT_ID,
  access_token: "new-access",
  refresh_token: "new-refresh",
  expires_at: 2_000_000_000,
};

beforeAll(async () => {
  await prisma.user.create({
    data: {
      id: USER_ID,
      accounts: {
        create: {
          type: "oauth",
          provider: "microsoft-entra-id",
          providerAccountId: PROVIDER_ACCOUNT_ID,
          access_token: "old-access",
          refresh_token: "dead-refresh",
          expires_at: 1,
        },
      },
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.account.updateMany({
    where: { userId: USER_ID },
    data: { access_token: "old-access", refresh_token: "dead-refresh", expires_at: 1 },
  });
  await prisma.mailSyncState.deleteMany({ where: { userId: USER_ID } });
  await prisma.mailSyncState.create({
    data: {
      userId: USER_ID,
      needsReconnect: true,
      lastError: "Failed to refresh Microsoft token: invalid_grant",
      lastAttemptAt: ATTEMPT,
      lastSuccessAt: new Date("2026-10-20T12:00:00.000Z"),
    },
  });
});

async function state() {
  return prisma.mailSyncState.findUniqueOrThrow({ where: { userId: USER_ID } });
}

describe("recordMicrosoftSignIn", () => {
  it("stores the new credential on the existing linked account", async () => {
    await recordMicrosoftSignIn(USER_ID, freshCredential);

    const account = await prisma.account.findFirstOrThrow({ where: { userId: USER_ID } });
    expect(account.access_token).toBe("new-access");
    expect(account.refresh_token).toBe("new-refresh");
    expect(account.expires_at).toBe(2_000_000_000);
  });

  it("clears needs-reconnect and the stale error so auto-sync can resume", async () => {
    await recordMicrosoftSignIn(USER_ID, freshCredential);

    const after = await state();
    expect(after.needsReconnect).toBe(false);
    expect(after.lastError).toBeNull();
    // The failed attempt no longer holds auto-sync back; the last success still sets the window.
    expect(after.lastAttemptAt).toBeNull();
    expect(after.lastSuccessAt).toEqual(new Date("2026-10-20T12:00:00.000Z"));
  });

  it("keeps the stored refresh token when Microsoft does not send a new one", async () => {
    await recordMicrosoftSignIn(USER_ID, { ...freshCredential, refresh_token: undefined });

    const account = await prisma.account.findFirstOrThrow({ where: { userId: USER_ID } });
    expect(account.access_token).toBe("new-access");
    expect(account.refresh_token).toBe("dead-refresh");
  });

  it("leaves a healthy sync state, including its attempt time, untouched", async () => {
    await prisma.mailSyncState.update({
      where: { userId: USER_ID },
      data: { needsReconnect: false, lastError: "Graph is down" },
    });

    await recordMicrosoftSignIn(USER_ID, freshCredential);

    const after = await state();
    expect(after.lastError).toBe("Graph is down");
    expect(after.lastAttemptAt).toEqual(ATTEMPT);
  });

  it("ignores a sign-in from another provider", async () => {
    await recordMicrosoftSignIn(USER_ID, { ...freshCredential, provider: "github" });

    expect((await state()).needsReconnect).toBe(true);
  });
});
