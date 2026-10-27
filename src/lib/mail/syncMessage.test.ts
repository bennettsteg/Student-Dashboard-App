import { describe, expect, it } from "vitest";

import { describeSyncOutcome } from "./syncMessage";

describe("describeSyncOutcome", () => {
  it("reports how many messages were synced, pluralised", () => {
    expect(describeSyncOutcome({ status: "synced", count: 1 })).toEqual({
      text: "Synced 1 recent message.",
      isError: false,
    });
    expect(describeSyncOutcome({ status: "synced", count: 25 })).toEqual({
      text: "Synced 25 recent messages.",
      isError: false,
    });
  });

  it("tells the student when to retry after a cooldown", () => {
    expect(describeSyncOutcome({ status: "cooldown", retryAfterSeconds: 1 })).toEqual({
      text: "Mail was synced a moment ago. Try again in 1 second.",
      isError: true,
    });
    expect(describeSyncOutcome({ status: "cooldown", retryAfterSeconds: 42 })).toEqual({
      text: "Mail was synced a moment ago. Try again in 42 seconds.",
      isError: true,
    });
  });

  it("explains a sync that is already running", () => {
    expect(describeSyncOutcome({ status: "already-running" })).toEqual({
      text: "A sync is already running.",
      isError: true,
    });
  });

  it("shows the failure reason", () => {
    expect(
      describeSyncOutcome({ status: "failed", error: "Graph said no", needsReconnect: false }),
    ).toEqual({ text: "Sync failed: Graph said no", isError: true });
  });
});
