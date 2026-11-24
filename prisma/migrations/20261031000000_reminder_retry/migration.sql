-- Reminder retries: remember when an attempt failed so the worker can retry later the same day.
-- Additive and safe with `migrate deploy`: a new nullable column, and lastSentLocalDate becomes
-- nullable (existing rows keep their value) because a row can now exist before any success.
ALTER TABLE "ReminderState" ALTER COLUMN "lastSentLocalDate" DROP NOT NULL;
ALTER TABLE "ReminderState" ADD COLUMN "lastFailedAt" TIMESTAMP(3);
