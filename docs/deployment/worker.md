# The background worker

The `worker` service in `docker-compose.yml` runs `worker/index.ts`, a separate long-running process. Today its only job is the automatic **Mail Sync** (ADR-0002). The daily Reminder digest will be added to the same process later.

## Run exactly one instance

Do not scale the `worker` service (`docker compose up --scale worker=2`) and do not run a second copy by hand on the same database. A restart is safe: when and whether a sync is due is read from the database, never kept in memory, so restarting the worker cannot cause an extra sync. Two workers running at once could each decide a sync is due in the same tick and both call Microsoft.

## How automatic mail sync works

- An hourly tick (and one at startup) checks each user with a connected Microsoft account.
- A sync starts only if Microsoft needs no reconnecting and at least 24 hours have passed since both the last successful sync and the last attempt. Manual "Sync mail" presses count, so syncing by hand pushes the next automatic sync out.
- One sync is one Graph call for the 25 newest messages (plus at most one token refresh). No paging, no other polling.
- A failed sync is recorded (Settings shows the error) and is not retried until 24 hours after the attempt.
- If Microsoft rejects the refresh token (`invalid_grant`), the account is flagged needs-reconnect and automatic sync pauses. Settings and Notifications show a Reconnect state. Clicking **Reconnect Microsoft** in Settings stores the new credential and clears the flag, and the next hourly tick resumes automatic sync.
- The ticks are logged as `[worker] mail tick: ...`; check them with `docker compose logs worker`.

Because the tick is hourly and a sync runs on the first tick after the 24-hour window ends, the time of day drifts later by up to an hour per day. That is intentional; it keeps the schedule free of sleep loops.

## Environment

The worker needs `DATABASE_URL`, `AUTH_MICROSOFT_ENTRA_ID_ID` and `AUTH_MICROSOFT_ENTRA_ID_SECRET` (it refreshes the Microsoft token itself). `docker-compose.yml` passes all three. The Graph permission stays `Mail.Read`.
