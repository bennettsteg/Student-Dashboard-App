# The background worker

The `worker` service in `docker-compose.yml` runs `worker/index.ts`, a separate long-running process. It does exactly two jobs: the automatic **Mail Sync** (ADR-0002) and the daily **Reminder** digest. Nothing else runs there.

## Run exactly one instance

Do not scale the `worker` service (`docker compose up --scale worker=2`) and do not run a second copy by hand on the same database. A restart is safe: when and whether a sync is due is read from the database, never kept in memory, so restarting the worker cannot cause an extra sync or a second Reminder. Two workers running at once could each decide a sync is due in the same tick and both call Microsoft, or both send the same Reminder.

## How automatic mail sync works

- An hourly tick (and one at startup) checks each user with a connected Microsoft account.
- A sync starts only if Microsoft needs no reconnecting and at least 24 hours have passed since both the last successful sync and the last attempt. Manual "Sync mail" presses count, so syncing by hand pushes the next automatic sync out.
- One sync is one Graph call for the 25 newest messages (plus at most one token refresh). No paging, no other polling.
- A failed sync is recorded (Settings shows the error) and is not retried until 24 hours after the attempt.
- If Microsoft rejects the refresh token (`invalid_grant`), the account is flagged needs-reconnect and automatic sync pauses. Settings and Notifications show a Reconnect state. Clicking **Reconnect Microsoft** in Settings stores the new credential and clears the flag, and the next hourly tick resumes automatic sync.
- The ticks are logged as `[worker] mail tick: ...`; check them with `docker compose logs worker`.

Because the tick is hourly and a sync runs on the first tick after the 24-hour window ends, the time of day drifts later by up to an hour per day. That is intentional; it keeps the schedule free of sleep loops.

## How the daily Reminder works

- A tick every 5 minutes (and one at startup) looks at each user who has Reminders switched on. It reads only the local database: no Graph or other external call, apart from the push itself.
- A Reminder is due when the overall Reminders switch is on, the local time in your timezone has reached your reminder time, no Reminder has been sent for today's local date, and at least one Assignment is due today (same local calendar date, including one whose time has already passed today).
- It sends one push per enabled device, with only a count ("2 assignments due today") and no titles. Tapping it opens Assignments. See [push-notifications.md](push-notifications.md) for devices and VAPID keys.
- Afterwards the local date is stored (per user, in the database), so later ticks and a worker restart never send a second Reminder that day. "At or after the reminder time" means a worker that was down at 08:00 and starts at 08:40 still sends it that morning, and a reminder time that a daylight-saving jump skips fires right after the jump.
- What is recorded when delivery is unusual:
  - **At least one device accepted it** (or every device was reported gone): the day is recorded, so devices that already got it are never sent it again. A device that failed transiently while another accepted keeps its registration and gets tomorrow's digest; one the push service reports gone (404/410) is deleted.
  - **No device accepted it and at least one failed for a transient reason** (push-service outage, network): the failure time is recorded and the day is not. The Reminder is retried once at least 15 minutes have passed, on the next 5-minute tick, until it succeeds or the local day ends at midnight. Nothing was accepted, so a retry cannot duplicate. If every attempt that day fails, no Reminder arrives and the worker logs each failure.
  - **No device is registered:** nothing is recorded. Nothing was sent, so there is no risk of a duplicate, and a device you enable later the same day still receives today's Reminder on the next tick.
  - **The server can't send pushes at all** (VAPID keys missing or invalid): nothing is recorded and the worker logs the error on each tick; fix the keys and the Reminder goes out the same day.
- If the worker process crashes in the instant between the push service accepting a push and the date being saved, that one Reminder could be sent again after the restart. This window is milliseconds wide and is accepted over the alternative of losing a Reminder.
- The ticks are logged as `[worker] reminder tick: ...`; check them with `docker compose logs worker`.

## Environment

The worker needs `DATABASE_URL`, `AUTH_MICROSOFT_ENTRA_ID_ID` and `AUTH_MICROSOFT_ENTRA_ID_SECRET` (it refreshes the Microsoft token itself), plus `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` to send Reminders. `docker-compose.yml` passes all of them. The Graph permission stays `Mail.Read`. The timezone, reminder time and on/off switch are Settings, stored in the database, not environment variables.

The `ReminderState` table (the stored last-sent date) comes from `prisma migrate deploy`, which the `migrate` service runs before the worker starts.
