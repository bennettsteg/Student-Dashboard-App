import { describe, expect, it } from "vitest";

import { microsoftConnectionState } from "./connection";

describe("microsoftConnectionState", () => {
  it("is not connected, offering Connect, when no Microsoft account is linked", () => {
    expect(microsoftConnectionState({ hasAccount: false, needsReconnect: false })).toEqual({
      status: "not-connected",
      action: "connect",
    });
  });

  it("is connected, offering Reconnect, when an account is linked and mail sync is healthy", () => {
    expect(microsoftConnectionState({ hasAccount: true, needsReconnect: false })).toEqual({
      status: "connected",
      action: "reconnect",
    });
  });

  it("needs reconnecting when Mail Sync recorded a dead refresh token", () => {
    expect(microsoftConnectionState({ hasAccount: true, needsReconnect: true })).toEqual({
      status: "needs-reconnect",
      action: "reconnect",
    });
  });

  it("offers Connect, not Reconnect, when the account is gone even if the flag was left set", () => {
    expect(microsoftConnectionState({ hasAccount: false, needsReconnect: true })).toEqual({
      status: "not-connected",
      action: "connect",
    });
  });
});
