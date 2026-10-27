import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { MicrosoftReconnectRequiredError } from "@/lib/graph/token";

import { runMailAutoSyncTick } from "./autoSync";
import type { MailSyncDeps } from "./sync";

// Live-database tests (needs a reachable DATABASE_URL). Two dedicated users are created in
// setup and deleted in teardown; only the Microsoft calls are replaced. Every "tick" below is a
// fresh call with only the database carrying state between them, as after a worker restart.

const RUN = `${process.pid}-${Date.now()}`;
const CONNECTED = `auto-sync-connected-${RUN}`;
const NO_ACCOUNT = `auto-sync-no-account-${RUN}`;

const HOUR_MS = 60 * 60 * 1000;
const T0 = new Date("2026-10-26T12:00:00.000Z");
const at = (msAfterT0: number) => new Date(T0.getTime() + msAfterT0);

/** Deps recording which users the tick fetched mail for; `failWith` makes the fetch throw. */
function fakeDeps(now: Date, failWith?: Error) {
  const fetchedFor: string[] = [];
  const deps: MailSyncDeps = {
    now: () => now,
    getAccessToken: async (userId) => {
      fetchedFor.push(userId);
      return "token";
    },
    fetchRecentMail: async () => {
      if (failWith) throw failWith;
      return [];
    },
  };
  return { deps, mine: () => fetchedFor.filter((id) => id === CONNECTED), all: fetchedFor };
}

beforeAll(async () => {
  await prisma.user.create({
    data: {
      id: CONNECTED,
      accounts: {
        create: {
          type: "oauth",
          provider: "microsoft-entra-id",
          providerAccountId: `acct-${RUN}`,
          access_token: "a",
          refresh_token: "r",
        },
      },
    },
  });
  await prisma.user.create({ data: { id: NO_ACCOUNT } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [CONNECTED, NO_ACCOUNT] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.mailSyncState.deleteMany({ where: { userId: { in: [CONNECTED, NO_ACCOUNT] } } });
});

describe("runMailAutoSyncTick", () => {
  it("syncs a connected user who has never synced, with one Graph call", async () => {
    const run = fakeDeps(T0);
    await runMailAutoSyncTick({ deps: run.deps });

    expect(run.mine()).toHaveLength(1);
    const state = await prisma.mailSyncState.findUniqueOrThrow({ where: { userId: CONNECTED } });
    expect(state.lastSuccessAt).toEqual(T0);
  });

  it("never syncs a user with no Microsoft account", async () => {
    const run = fakeDeps(T0);
    await runMailAutoSyncTick({ deps: run.deps });

    expect(run.all).not.toContain(NO_ACCOUNT);
  });

  it("does not sync again on later hourly ticks, or after a restart, inside 24 hours", async () => {
    await runMailAutoSyncTick({ deps: fakeDeps(T0).deps });

    for (const hours of [1, 2, 23]) {
      const run = fakeDeps(at(hours * HOUR_MS));
      await runMailAutoSyncTick({ deps: run.deps });
      expect(run.mine()).toHaveLength(0);
    }
  });

  it("syncs again once 24 hours have passed", async () => {
    await runMailAutoSyncTick({ deps: fakeDeps(T0).deps });

    const run = fakeDeps(at(24 * HOUR_MS));
    await runMailAutoSyncTick({ deps: run.deps });
    expect(run.mine()).toHaveLength(1);
  });

  it("records a failure and does not retry it on later ticks until the next window", async () => {
    await runMailAutoSyncTick({ deps: fakeDeps(T0, new Error("Graph is down")).deps });
    const state = await prisma.mailSyncState.findUniqueOrThrow({ where: { userId: CONNECTED } });
    expect(state.lastError).toBe("Graph is down");
    expect(state.lastSuccessAt).toBeNull();

    for (const hours of [1, 2, 23]) {
      const run = fakeDeps(at(hours * HOUR_MS));
      await runMailAutoSyncTick({ deps: run.deps });
      expect(run.mine()).toHaveLength(0);
    }

    const next = fakeDeps(at(24 * HOUR_MS));
    await runMailAutoSyncTick({ deps: next.deps });
    expect(next.mine()).toHaveLength(1);
  });

  it("pauses auto-sync when Microsoft rejects the refresh token, until the flag is cleared", async () => {
    const failing = fakeDeps(T0, new MicrosoftReconnectRequiredError("invalid_grant"));
    await runMailAutoSyncTick({ deps: failing.deps });
    const state = await prisma.mailSyncState.findUniqueOrThrow({ where: { userId: CONNECTED } });
    expect(state.needsReconnect).toBe(true);

    const later = fakeDeps(at(3 * 24 * HOUR_MS));
    await runMailAutoSyncTick({ deps: later.deps });
    expect(later.mine()).toHaveLength(0);

    await prisma.mailSyncState.update({ where: { userId: CONNECTED }, data: { needsReconnect: false } });
    const resumed = fakeDeps(at(3 * 24 * HOUR_MS));
    await runMailAutoSyncTick({ deps: resumed.deps });
    expect(resumed.mine()).toHaveLength(1);
  });
});
