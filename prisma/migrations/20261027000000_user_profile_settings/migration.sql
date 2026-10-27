-- Settings (issue #11): profile and reminder preferences on the single User row.
-- All columns are additive with defaults, so existing rows need no backfill and the migration
-- is safe with `migrate deploy`. Reminders stay disabled until the student turns them on.
ALTER TABLE "User"
  ADD COLUMN "program" TEXT,
  ADD COLUMN "termLabel" TEXT,
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "reminderTime" TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT false;
