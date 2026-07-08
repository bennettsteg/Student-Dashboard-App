"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { triggerBlackboardSync } from "@/server-actions/sync-actions";
import type { SyncResult } from "@/lib/ical/sync";

export function SyncButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await triggerBlackboardSync();
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleClick} disabled={pending}>
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-muted-foreground">
          Created {result.created}, updated {result.updated}, unchanged {result.unchanged},
          cancelled {result.cancelled}, kept {result.skippedUserModified} edited events untouched.
        </p>
      )}
    </div>
  );
}
