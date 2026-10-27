-- Notifications are now Outlook mail only (read-only list).

-- Teams items can no longer be represented once the enum values are gone. Teams/Chat was
-- never part of the shipped scope, so any such rows are unreachable leftovers.
DELETE FROM "NotificationItem" WHERE "source" <> 'EMAIL';

-- Drop the unused Teams enum values (Postgres can't DROP VALUE, so swap the type).
ALTER TYPE "NotificationSource" RENAME TO "NotificationSource_old";
CREATE TYPE "NotificationSource" AS ENUM ('EMAIL');
ALTER TABLE "NotificationItem"
  ALTER COLUMN "source" TYPE "NotificationSource" USING ("source"::text::"NotificationSource");
DROP TYPE "NotificationSource_old";

-- "Open in Outlook" target; drop the unused raw Graph payload.
ALTER TABLE "NotificationItem" ADD COLUMN "webLink" TEXT;
ALTER TABLE "NotificationItem" DROP COLUMN "raw";

-- Per-user Mail Sync state.
CREATE TABLE "MailSyncState" (
    "userId" TEXT NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "needsReconnect" BOOLEAN NOT NULL DEFAULT false,
    "syncStartedAt" TIMESTAMP(3),

    CONSTRAINT "MailSyncState_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "MailSyncState"
  ADD CONSTRAINT "MailSyncState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
