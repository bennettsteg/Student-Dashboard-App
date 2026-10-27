-- When the last successful Mail Sync stored a message not seen before. Purely additive
-- (a nullable column), so it is safe with `migrate deploy`; null until the next sync that brings new mail.
ALTER TABLE "MailSyncState" ADD COLUMN "lastNewMailAt" TIMESTAMP(3);
