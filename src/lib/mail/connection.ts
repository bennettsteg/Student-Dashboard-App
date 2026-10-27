export type MicrosoftConnectionStatus = "not-connected" | "connected" | "needs-reconnect";

export interface MicrosoftConnectionState {
  status: MicrosoftConnectionStatus;
  /** Which button Settings offers: first-time Connect, or Reconnect for an existing link. */
  action: "connect" | "reconnect";
}

/**
 * What Settings shows for the Microsoft link. Derived only from the stored Account row and
 * Mail Sync's needs-reconnect flag, so rendering Settings never calls Microsoft or refreshes a
 * token.
 */
export function microsoftConnectionState({
  hasAccount,
  needsReconnect,
}: {
  hasAccount: boolean;
  needsReconnect: boolean;
}): MicrosoftConnectionState {
  if (!hasAccount) return { status: "not-connected", action: "connect" };
  return { status: needsReconnect ? "needs-reconnect" : "connected", action: "reconnect" };
}
