import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import type { GraphMailItem } from "@/lib/graph/mail";

import { markAllRead, setNotificationRead } from "./notifications";
import { runMailSync, type MailSyncDeps } from "./sync";
import { MicrosoftReconnectRequiredError } from "@/lib/graph/token";

// Live-database tests (needs a reachable DATABASE_URL): a dedicated user is created in setup
// and deleted in teardown, which cascades to its notifications and sync state. Only the two
// Microsoft calls (token, Graph fetch) are replaced.

const USER_ID = `mail-sync-test-${process.pid}-${Date.now()}`;
const T0 = new Date("2026-10-26T12:00:00.000Z");
const at = (secondsAfterT0: number) => new Date(T0.getTime() + secondsAfterT0 * 1000);

function message(id: string, overrides: Partial<GraphMailItem> = {}): GraphMailItem {
  return {
    id,
    subject: `Subject ${id}`,
    bodyPreview: `Preview ${id}`,
    fromName: "Prof Example",
    fromAddress: "prof@example.edu",
    receivedDateTime: "2026-10-26T09:00:00.000Z",
    isRead: false,
    conversationId: `conv-${id}`,
    webLink: `https://outlook.live.com/owa/?ItemID=${id}`,
    ...overrides,
  };
}

/** Deps whose Graph fetch returns whatever `inbox.messages` currently holds, counting calls. */
function fakeDeps(inbox: { messages: GraphMailItem[] }, now: Date) {
  const calls = { fetch: 0, token: 0 };
  const deps: MailSyncDeps = {
    now: () => now,
    getAccessToken: async () => {
      calls.token++;
      return "token";
    },
    fetchRecentMail: async () => {
      calls.fetch++;
      return inbox.messages;
    },
  };
  return { deps, calls };
}

async function stored(externalId: string) {
  return prisma.notificationItem.findUniqueOrThrow({
    where: { userId_source_externalId: { userId: USER_ID, source: "EMAIL", externalId } },
  });
}

beforeAll(async () => {
  await prisma.user.create({ data: { id: USER_ID } });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.notificationItem.deleteMany({ where: { userId: USER_ID } });
  await prisma.mailSyncState.deleteMany({ where: { userId: USER_ID } });
});

describe("runMailSync: storing Notifications", () => {
  it("stores new messages with sender, subject, preview and the Outlook web link", async () => {
    const { deps } = fakeDeps({ messages: [message("a")] }, T0);

    const outcome = await runMailSync(USER_ID, { trigger: "manual", deps });

    expect(outcome).toEqual({ status: "synced", count: 1 });
    expect(await stored("a")).toMatchObject({
      subject: "Subject a",
      preview: "Preview a",
      fromName: "Prof Example",
      fromAddress: "prof@example.edu",
      webLink: "https://outlook.live.com/owa/?ItemID=a",
      receivedAt: new Date("2026-10-26T09:00:00.000Z"),
    });
  });

  it("takes Outlook's read state on first creation", async () => {
    const inbox = { messages: [message("read", { isRead: true }), message("unread")] };
    const { deps } = fakeDeps(inbox, T0);

    await runMailSync(USER_ID, { trigger: "manual", deps });

    expect((await stored("read")).isRead).toBe(true);
    expect((await stored("unread")).isRead).toBe(false);
  });

  it("never changes the read flag on later syncs, in either direction", async () => {
    const inbox = { messages: [message("read", { isRead: true }), message("unread")] };
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps(inbox, T0).deps });

    // The student triages inside StudyDesk...
    await setNotificationRead(USER_ID, (await stored("read")).id, false);
    await setNotificationRead(USER_ID, (await stored("unread")).id, true);
    // ...while Outlook still reports the original states (or the opposite).
    inbox.messages = [message("read", { isRead: true }), message("unread", { isRead: false })];
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps(inbox, at(120)).deps });

    expect((await stored("read")).isRead).toBe(false);
    expect((await stored("unread")).isRead).toBe(true);
  });

  it("refreshes the other fields of a message it has already stored", async () => {
    const inbox = { messages: [message("a")] };
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps(inbox, T0).deps });

    inbox.messages = [message("a", { subject: "Edited subject", bodyPreview: "New preview" })];
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps(inbox, at(120)).deps });

    expect(await stored("a")).toMatchObject({ subject: "Edited subject", preview: "New preview" });
    expect(await prisma.notificationItem.count({ where: { userId: USER_ID } })).toBe(1);
  });
});

describe("marking Notifications read and unread", () => {
  it("marks a single Notification read or unread", async () => {
    await runMailSync(USER_ID, {
      trigger: "manual",
      deps: fakeDeps({ messages: [message("a")] }, T0).deps,
    });
    const { id } = await stored("a");

    await setNotificationRead(USER_ID, id, true);
    expect((await stored("a")).isRead).toBe(true);
    await setNotificationRead(USER_ID, id, false);
    expect((await stored("a")).isRead).toBe(false);
  });

  it("refuses to touch another user's Notification", async () => {
    await runMailSync(USER_ID, {
      trigger: "manual",
      deps: fakeDeps({ messages: [message("a")] }, T0).deps,
    });
    const { id } = await stored("a");

    await expect(setNotificationRead("someone-else", id, true)).rejects.toThrow(/not found/i);
    expect((await stored("a")).isRead).toBe(false);
  });

  it("marks all of the user's Notifications read", async () => {
    await runMailSync(USER_ID, {
      trigger: "manual",
      deps: fakeDeps({ messages: [message("a"), message("b")] }, T0).deps,
    });

    await markAllRead(USER_ID);

    expect((await stored("a")).isRead).toBe(true);
    expect((await stored("b")).isRead).toBe(true);
  });
});

describe("runMailSync: sync state, cooldown and failures", () => {
  it("records the last successful sync time", async () => {
    const { deps } = fakeDeps({ messages: [] }, T0);

    await runMailSync(USER_ID, { trigger: "manual", deps });

    expect(await prisma.mailSyncState.findUnique({ where: { userId: USER_ID } })).toMatchObject({
      lastSuccessAt: T0,
      lastAttemptAt: T0,
      lastError: null,
      needsReconnect: false,
      syncStartedAt: null,
    });
  });

  it("refuses a second manual sync inside the 60-second cooldown without calling Graph", async () => {
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps({ messages: [] }, T0).deps });

    const second = fakeDeps({ messages: [] }, at(59));
    const outcome = await runMailSync(USER_ID, { trigger: "manual", deps: second.deps });

    expect(outcome).toEqual({ status: "cooldown", retryAfterSeconds: 1 });
    expect(second.calls).toEqual({ fetch: 0, token: 0 });
  });

  it("allows a manual sync once the cooldown has passed", async () => {
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps({ messages: [] }, T0).deps });

    const outcome = await runMailSync(USER_ID, {
      trigger: "manual",
      deps: fakeDeps({ messages: [message("a")] }, at(60)).deps,
    });

    expect(outcome).toEqual({ status: "synced", count: 1 });
  });

  it("runs only one sync at a time when two are started together", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const calls = { fetch: 0 };
    const slowDeps: MailSyncDeps = {
      now: () => T0,
      getAccessToken: async () => "token",
      fetchRecentMail: async () => {
        calls.fetch++;
        await gate;
        return [];
      },
    };

    const first = runMailSync(USER_ID, { trigger: "manual", deps: slowDeps });
    const second = runMailSync(USER_ID, { trigger: "manual", deps: slowDeps });
    await new Promise((resolve) => setTimeout(resolve, 200));
    release();
    const outcomes = await Promise.all([first, second]);

    expect(calls.fetch).toBe(1);
    expect(outcomes.map((o) => o.status).sort()).toEqual(["already-running", "synced"]);
  });

  it("is not subject to the manual cooldown when the sync is automatic", async () => {
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps({ messages: [] }, T0).deps });

    const outcome = await runMailSync(USER_ID, {
      trigger: "auto",
      deps: fakeDeps({ messages: [] }, at(5)).deps,
    });

    expect(outcome).toEqual({ status: "synced", count: 0 });
  });

  it("records a failure, keeps the previous success time, and still applies the cooldown", async () => {
    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps({ messages: [] }, T0).deps });
    const failing: MailSyncDeps = {
      now: () => at(120),
      getAccessToken: async () => "token",
      fetchRecentMail: async () => {
        throw new Error("Graph API error 503");
      },
    };

    const outcome = await runMailSync(USER_ID, { trigger: "manual", deps: failing });

    expect(outcome).toEqual({
      status: "failed",
      error: "Graph API error 503",
      needsReconnect: false,
    });
    expect(await prisma.mailSyncState.findUnique({ where: { userId: USER_ID } })).toMatchObject({
      lastSuccessAt: T0,
      lastAttemptAt: at(120),
      lastError: "Graph API error 503",
      needsReconnect: false,
      syncStartedAt: null,
    });
    const retry = await runMailSync(USER_ID, {
      trigger: "manual",
      deps: fakeDeps({ messages: [] }, at(130)).deps,
    });
    expect(retry.status).toBe("cooldown");
  });

  it("flags needs-reconnect when Microsoft rejects the refresh token, and clears it after a later success", async () => {
    const dead: MailSyncDeps = {
      now: () => T0,
      getAccessToken: async () => {
        throw new MicrosoftReconnectRequiredError("invalid_grant");
      },
      fetchRecentMail: async () => [],
    };

    const outcome = await runMailSync(USER_ID, { trigger: "manual", deps: dead });

    expect(outcome).toMatchObject({ status: "failed", needsReconnect: true });
    expect((await prisma.mailSyncState.findUniqueOrThrow({ where: { userId: USER_ID } })).needsReconnect).toBe(true);

    await runMailSync(USER_ID, { trigger: "manual", deps: fakeDeps({ messages: [] }, at(120)).deps });

    expect(await prisma.mailSyncState.findUnique({ where: { userId: USER_ID } })).toMatchObject({
      needsReconnect: false,
      lastError: null,
      lastSuccessAt: at(120),
    });
  });
});
