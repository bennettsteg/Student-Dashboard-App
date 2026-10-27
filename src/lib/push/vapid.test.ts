import { describe, expect, it } from "vitest";

import { readVapidConfig } from "./vapid";

const PUBLIC = "BPublicKeyExample";
const PRIVATE = "privateKeyExample";

describe("VAPID config from the environment", () => {
  it("reads the key pair and an explicit subject", () => {
    expect(
      readVapidConfig({
        VAPID_PUBLIC_KEY: PUBLIC,
        VAPID_PRIVATE_KEY: PRIVATE,
        VAPID_SUBJECT: "mailto:me@example.edu",
      }),
    ).toEqual({
      ok: true,
      publicKey: PUBLIC,
      privateKey: PRIVATE,
      subject: "mailto:me@example.edu",
    });
  });

  it("falls back to the https AUTH_URL as the subject", () => {
    const result = readVapidConfig({
      VAPID_PUBLIC_KEY: PUBLIC,
      VAPID_PRIVATE_KEY: PRIVATE,
      AUTH_URL: "https://host.tail1234.ts.net",
    });
    expect(result).toMatchObject({ ok: true, subject: "https://host.tail1234.ts.net" });
  });

  it("is not configured when a key is missing or blank", () => {
    expect(readVapidConfig({ VAPID_PRIVATE_KEY: PRIVATE, VAPID_SUBJECT: "mailto:a@b.co" })).toMatchObject({
      ok: false,
    });
    expect(
      readVapidConfig({ VAPID_PUBLIC_KEY: PUBLIC, VAPID_PRIVATE_KEY: "  ", VAPID_SUBJECT: "mailto:a@b.co" }),
    ).toMatchObject({ ok: false });
  });

  it("is not configured without a usable subject (plain-http AUTH_URL is not one)", () => {
    const result = readVapidConfig({
      VAPID_PUBLIC_KEY: PUBLIC,
      VAPID_PRIVATE_KEY: PRIVATE,
      AUTH_URL: "http://localhost:3000",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/VAPID_SUBJECT/);
  });
});
