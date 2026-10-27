# Assignment model migration

Migration `prisma/migrations/20261026000000_assignment_model` replaces the old `CalendarEvent` table with a lean `Assignment` table (ADR-0001: Assignments are entered by hand, Blackboard sync is gone). It is destructive, but the data it converts is re-enterable, so a backup is optional (the steps below remain if you want one).

## What it does to existing data

| Old data | Result |
| --- | --- |
| Blackboard-synced events (`source = BLACKBOARD_ICS`) | Deleted |
| Manual events flagged as assignments | Converted to Assignments, keeping their ids. Due time comes from the old `dueAt` (or `startAt` if it was missing); the old description becomes the Assignment's notes |
| Manual assignments with no Course | Attached to a new Course named **Unassigned (migrated)**, one per user who has any. It has no meeting days, so it never appears on the Schedule; rename or drop it from the Courses page (renaming it through the current edit form needs you to pick at least one meeting day) |
| Manual events that are not assignments (and an event's location) | Dropped, not converted |
| Courses | Untouched |

Afterwards the `CalendarEvent` table and the `EventSource` / `EventStatus` enums no longer exist. Deleting a Course now deletes its Assignments (`ON DELETE CASCADE`).

The migration is plain SQL and applies with `prisma migrate deploy` (no shadow database needed).

## Steps

Postgres is not defined in this repo's `docker-compose.yml`: the stack joins the external `database-network` and reaches a Postgres container that runs separately (for example under Portainer). Below, `<postgres-container>` is that container's name (find it with `docker ps`) and `$POSTGRES_USER` / `$POSTGRES_DB` are its database credentials.

### 1. Back up the database (optional)

```bash
docker exec -i <postgres-container> sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > studydesk-before-assignment-migration.dump
ls -lh studydesk-before-assignment-migration.dump   # should not be empty
```

Keep the file somewhere other than the Postgres data directory. Do this **before** pulling the new code and running `docker compose up`, because the `migrate` service applies pending migrations automatically on start.

### 2. Deploy

```bash
git pull
docker compose up -d --build
docker compose logs migrate    # expect "All migrations have been successfully applied."
```

### 3. Check the result

- Open Assignments: every Course you had shows the same assignments as before.
- If you had assignments with no Course, a Course called **Unassigned (migrated)** now holds them.

## Rolling back

The migration is not reversible in place. To go back, stop the stack, restore the dump (`--clean` drops the new objects first), and redeploy the previous version of the code:

```bash
docker compose down
git checkout <previous-commit>
docker exec -i <postgres-container> sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < studydesk-before-assignment-migration.dump
docker compose up -d --build
```

## Local development

The local `prisma dev` Postgres cannot create a shadow database, so iterate on the schema with `npx prisma db push`. To exercise this migration against old-shaped rows, point `DATABASE_URL` at an empty database, run `npx prisma migrate deploy` up to the previous migration, insert some `CalendarEvent` rows, then apply this one.
