-- Reminder state (issue #16): per user, the local date of the last Reminder digest sent.
-- Purely additive (a new table), so it is safe with `migrate deploy` and needs no backfill: a
-- user with no row has never been sent a Reminder.
CREATE TABLE "ReminderState" (
    "userId" TEXT NOT NULL,
    "lastSentLocalDate" TEXT NOT NULL,

    CONSTRAINT "ReminderState_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "ReminderState" ADD CONSTRAINT "ReminderState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
