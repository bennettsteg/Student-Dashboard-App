import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import {
  listSubscriptions,
  registerSubscription,
  removeSubscription,
  type PushSubscriptionInput,
} from "./subscriptions";

// Live-database tests: dedicated users are created in setup and deleted in teardown.

const RUN = `${process.pid}-${Date.now()}`;
const USER_ID = `push-sub-test-${RUN}`;
const OTHER_USER_ID = `push-sub-test-other-${RUN}`;

const phone: PushSubscriptionInput = {
  endpoint: `https://web.push.apple.com/phone-${RUN}`,
  keys: { p256dh: "phone-p256dh", auth: "phone-auth" },
};
const laptop: PushSubscriptionInput = {
  endpoint: `https://fcm.googleapis.com/fcm/send/laptop-${RUN}`,
  keys: { p256dh: "laptop-p256dh", auth: "laptop-auth" },
};

beforeAll(async () => {
  await prisma.user.create({ data: { id: USER_ID } });
  await prisma.user.create({ data: { id: OTHER_USER_ID } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [USER_ID, OTHER_USER_ID] } } });
  await prisma.$disconnect();
});

describe("push subscription registration", () => {
  it("stores one row per enabled device", async () => {
    expect(await registerSubscription(USER_ID, phone)).toEqual({ ok: true });
    expect(await registerSubscription(USER_ID, laptop)).toEqual({ ok: true });

    const stored = await listSubscriptions(USER_ID);
    expect(stored.map((s) => s.endpoint).sort()).toEqual([laptop.endpoint, phone.endpoint].sort());
    expect(stored.find((s) => s.endpoint === phone.endpoint)).toMatchObject({
      p256dh: "phone-p256dh",
      auth: "phone-auth",
    });
  });

  it("registering the same device again updates its keys instead of adding a second row", async () => {
    await registerSubscription(USER_ID, phone);
    await registerSubscription(USER_ID, { ...phone, keys: { p256dh: "rotated", auth: "rotated-auth" } });

    const forPhone = (await listSubscriptions(USER_ID)).filter((s) => s.endpoint === phone.endpoint);
    expect(forPhone).toHaveLength(1);
    expect(forPhone[0]).toMatchObject({ p256dh: "rotated", auth: "rotated-auth" });
  });

  it("removes only the device being turned off", async () => {
    await registerSubscription(USER_ID, phone);
    await registerSubscription(USER_ID, laptop);

    await removeSubscription(USER_ID, phone.endpoint);

    expect((await listSubscriptions(USER_ID)).map((s) => s.endpoint)).toEqual([laptop.endpoint]);
  });

  it("never removes another user's device", async () => {
    await registerSubscription(OTHER_USER_ID, phone);

    await removeSubscription(USER_ID, phone.endpoint);

    expect((await listSubscriptions(OTHER_USER_ID)).map((s) => s.endpoint)).toEqual([phone.endpoint]);
  });

  it("rejects subscriptions that are not a push service https endpoint with both keys", async () => {
    const bad = [
      { endpoint: "http://insecure.example/x", keys: phone.keys },
      { endpoint: "not a url", keys: phone.keys },
      { endpoint: phone.endpoint, keys: { p256dh: "", auth: "a" } },
      { endpoint: phone.endpoint, keys: { p256dh: "p", auth: "" } },
      { endpoint: phone.endpoint },
      null,
    ];
    for (const input of bad) {
      const result = await registerSubscription(USER_ID, input as unknown as PushSubscriptionInput);
      expect(result.ok).toBe(false);
    }
  });
});
