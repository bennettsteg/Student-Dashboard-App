-- New users start in US Central time instead of UTC. Only the column default changes: existing
-- rows keep whatever timezone they have, so this is safe with `migrate deploy` and needs no backfill.
ALTER TABLE "User" ALTER COLUMN "timezone" SET DEFAULT 'America/Chicago';
