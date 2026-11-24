-- Last-chance Reminder: a second daily Reminder, timed late in the day (default 23:30),
-- alongside the existing one (now named the Morning Reminder). Every existing value is
-- preserved by the renames below, and the new columns have defaults, so no backfill is needed
-- and this is safe with `migrate deploy`. The new column on "User" defaults to 23:30 for every
-- row, so anyone who already has Reminders on gets both starting immediately. Runs after
-- 20261031000000_reminder_retry, so "lastFailedAt" already exists and is renamed alongside
-- "lastSentLocalDate".
ALTER TABLE "User" RENAME COLUMN "reminderTime" TO "morningReminderTime";
ALTER TABLE "User" ADD COLUMN "lastChanceReminderTime" TEXT NOT NULL DEFAULT '23:30';

ALTER TABLE "ReminderState" RENAME COLUMN "lastSentLocalDate" TO "morningSentLocalDate";
ALTER TABLE "ReminderState" ALTER COLUMN "morningSentLocalDate" DROP NOT NULL;
ALTER TABLE "ReminderState" ADD COLUMN "lastChanceSentLocalDate" TEXT;
ALTER TABLE "ReminderState" RENAME COLUMN "lastFailedAt" TO "morningFailedAt";
ALTER TABLE "ReminderState" ADD COLUMN "lastChanceFailedAt" TIMESTAMP(3);
