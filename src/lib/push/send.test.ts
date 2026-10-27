import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { buildReminderPayload } from "./payload";
import { sendPushToUser, type PushSender } from "./send";
import { listSubscriptions, registerSubscription } from "./subscriptions";

// Live-database tests with a fake push service (the only external boundary): the sender stands
// in for web-push and the push service, which can't be reached from here.

const RUN = `${process.pid}-${Date.now()}`;
const USER_ID = `push-send-test-${RUN}`;
const OTHER_USER_ID = `push-send-test-other-${RUN}`;

const device = (name: string) => ({
  endpoint: `https://push.example.com/${name}-${RUN}`,
  keys: { p256dh: `${name}-p256dh`, auth: `${name}-auth` },
});
const phone = device("phone");
const laptop = device("laptop");
const old = device("old");

class PushServiceError extends Error {
  constructor(readonly statusCode: number) {
    super(`push service said ${statusCode}`);
  }
}

/** A fake push service: records deliveries, fails with the status mapped to an endpoint. */
function fakePushService(failures: Record<string, number> = {}) {
  const delivered: { endpoint: string; body: string }[] = [];
  const sender: PushSender = async (subscription, body) => {
    const status = failures[subscription.endpoint];
    if (status) throw new PushServiceError(status);
    delivered.push({ endpoint: subscription.endpoint, body });
  };
  return { sender, delivered };
}

const endpointsOf = async () => (await listSubscriptions(USER_ID)).map((s) => s.endpoint).sort();

beforeAll(async () => {
  await prisma.user.create({ data: { id: USER_ID } });
  await prisma.user.create({ data: { id: OTHER_USER_ID } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [USER_ID, OTHER_USER_ID] } } });
  await prisma.$disconnect();
});

async function resetDevices(...devices: ReturnType<typeof device>[]) {
  await prisma.pushSubscription.deleteMany({ where: { userId: { in: [USER_ID, OTHER_USER_ID] } } });
  for (const d of devices) await registerSubscription(USER_ID, d);
}

describe("sendPushToUser", () => {
  it("sends the payload to every device of that user and no one else's", async () => {
    await resetDevices(phone, laptop);
    await registerSubscription(OTHER_USER_ID, device("strangers"));
    const { sender, delivered } = fakePushService();

    const result = await sendPushToUser(USER_ID, buildReminderPayload(2), { sender });

    expect(result).toEqual({ sent: 2, removed: 0, failed: 0 });
    expect(delivered.map((d) => d.endpoint).sort()).toEqual([laptop.endpoint, phone.endpoint].sort());
    for (const d of delivered) {
      expect(JSON.parse(d.body)).toEqual({
        title: "StudyDesk",
        body: "2 assignments due today",
        url: "/assignments",
      });
    }
  });

  it.each([404, 410])("deletes a subscription the push service reports gone (%i)", async (status) => {
    await resetDevices(phone, old);
    const { sender, delivered } = fakePushService({ [old.endpoint]: status });

    const result = await sendPushToUser(USER_ID, buildReminderPayload(1), { sender });

    expect(result).toEqual({ sent: 1, removed: 1, failed: 0 });
    expect(delivered.map((d) => d.endpoint)).toEqual([phone.endpoint]);
    expect(await endpointsOf()).toEqual([phone.endpoint]);
  });

  it("keeps a subscription after a transient failure, counts it, and still reaches the other devices", async () => {
    await resetDevices(phone, laptop);
    const { sender, delivered } = fakePushService({ [phone.endpoint]: 500 });

    const result = await sendPushToUser(USER_ID, buildReminderPayload(1), { sender });

    expect(result).toEqual({ sent: 1, removed: 0, failed: 1 });
    expect(delivered.map((d) => d.endpoint)).toEqual([laptop.endpoint]);
    expect(await endpointsOf()).toEqual([laptop.endpoint, phone.endpoint].sort());
  });

  it("can target a single device (the Settings test push)", async () => {
    await resetDevices(phone, laptop);
    const { sender, delivered } = fakePushService();

    const result = await sendPushToUser(USER_ID, buildReminderPayload(1), {
      sender,
      endpoint: laptop.endpoint,
    });

    expect(result).toEqual({ sent: 1, removed: 0, failed: 0 });
    expect(delivered.map((d) => d.endpoint)).toEqual([laptop.endpoint]);
  });

  it("does nothing for a user with no registered devices", async () => {
    await resetDevices();
    const { sender, delivered } = fakePushService();

    expect(await sendPushToUser(USER_ID, buildReminderPayload(1), { sender })).toEqual({
      sent: 0,
      removed: 0,
      failed: 0,
    });
    expect(delivered).toEqual([]);
  });

  it("reports when push isn't configured on the server and sends nothing", async () => {
    await resetDevices(phone);

    const result = await sendPushToUser(USER_ID, buildReminderPayload(1), {
      env: { AUTH_URL: "http://localhost:3000" },
    });

    expect(result).toMatchObject({ sent: 0, removed: 0, failed: 0 });
    expect(result.error).toMatch(/VAPID/);
    expect(await endpointsOf()).toEqual([phone.endpoint]);
  });
});
