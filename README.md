# StudyDesk

A personal, single-user dashboard for one student: courses, assignments and grades entered by hand, Outlook mail shown read-only, and daily push Reminders for assignments due today. It is self-hosted with Docker on a home server, reached only over a private Tailscale network, and installed as an app (PWA) on the student's own devices. It is not multi-tenant and has no login wall: the network boundary is the access control.

Built with Next.js, Prisma 7 + Postgres, NextAuth (Microsoft Entra ID, optional) and Web Push. Domain terms are defined in [CONTEXT.md](CONTEXT.md), decisions in [docs/adr/](docs/adr/), and code conventions in [CLAUDE.md](CLAUDE.md).

## Local development

```bash
npm ci
cp .env.example .env              # then fill in what you need (see Configuration)
npx prisma generate               # generates src/generated/prisma
npx prisma dev -d                 # local Postgres (no Docker needed); see CLAUDE.md
npx prisma migrate deploy         # or `npx prisma db push` while iterating on the schema
npm run dev
```

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build`. Some tests use a live database (all migrations applied); run them against a scratch database, not your real data. See CLAUDE.md.

## Install and operate (Docker)

Prerequisites on the home server: Docker with Compose, a Postgres database that runs as its own container, and Tailscale installed on the host (not in a container).

1. **Network and database.** `docker-compose.yml` does not define Postgres. Its services join the external Docker network `database-network` (`docker network create database-network` if it doesn't exist) and reach your separate Postgres container over it. Create an empty database and user there first.
2. **Configure.** Copy `.env.example` to `.env` next to `docker-compose.yml` and fill it in (table below). Never commit `.env`.
3. **Build and run.**

   ```bash
   docker compose up -d --build
   docker compose logs migrate     # expect "All migrations have been successfully applied."
   curl -sI http://127.0.0.1:3000/api/health   # 200
   ```

   This starts three services from one image build: `migrate` (one-shot `prisma migrate deploy`), `app` (the web app, published on `127.0.0.1:3000` only) and `worker` (background jobs). `app` and `worker` wait for `migrate` to finish.
4. **Serve it over HTTPS on the tailnet** with `tailscale serve`, set `AUTH_URL` and the Microsoft redirect URI to match, and confirm Funnel is off. Follow [docs/deployment/tailnet-https.md](docs/deployment/tailnet-https.md). Do not open port 3000 to the LAN or the internet and never use Tailscale Funnel: the app has no login.
5. **Generate the VAPID keys once** for push Reminders and put them in `.env`. Keep them stable: changing them silently breaks every enabled device. See [docs/deployment/push-notifications.md](docs/deployment/push-notifications.md).
6. **Install the app on your devices** (iPhone Safari Home Screen, Brave or Edge on desktop) and enable Reminders from Settings: [docs/deployment/install-pwa.md](docs/deployment/install-pwa.md).
7. **Run the manual verification checklist** once on real devices: [docs/deployment/manual-verification.md](docs/deployment/manual-verification.md).

### Configuration

All variables live in `.env`; `docker-compose.yml` passes them to the services that need them.

| Variable | Needed by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | app, worker, migrate | Postgres connection string (host is your Postgres container's name on `database-network`) |
| `AUTH_SECRET` | app | Auth.js session secret (`npx auth secret` or `openssl rand -base64 32`) |
| `AUTH_URL` | app (worker: VAPID subject fallback) | The public base URL, `https://<host>.<tailnet>.ts.net` when deployed; must match the Entra redirect URI `<AUTH_URL>/api/auth/callback/microsoft-entra-id` |
| `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` | app, worker | Entra app registration (multi-tenant + personal accounts). Only used for the optional Microsoft connection and Mail Sync |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | app, worker | Web Push. Optional: without them the app works and Settings says push isn't set up. Subject is `mailto:you@example.com` or an https URL |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | app | Leave unset (defaults to the `common` endpoint). Not in `.env.example` on purpose |

The timezone, reminder time and Reminders switch are Settings in the app, stored in the database, not environment variables.

### The worker: exactly one instance

The `worker` service runs two ticks: an hourly automatic Mail Sync (at most one Microsoft Graph call per 24 hours) and a Reminder check every 5 minutes. **Run exactly one instance**; never `--scale worker=2` or start a second copy against the same database. Restarting it is safe. Details and log lines: [docs/deployment/worker.md](docs/deployment/worker.md).

### Updating and migrations

Database migrations are applied automatically by the `migrate` service on every `docker compose up`, so **take a backup before pulling and rebuilding**:

```bash
docker exec -i <postgres-container> sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > studydesk-backup.dump
git pull
docker compose up -d --build
docker compose logs migrate
```

Restoring from the dump, and what the one destructive migration (the Assignment model) does to existing data, are in [docs/deployment/assignment-migration.md](docs/deployment/assignment-migration.md). Back up `.env` (especially the VAPID keys) too.

### Deployment docs

- [tailnet-https.md](docs/deployment/tailnet-https.md): HTTPS on the tailnet, `AUTH_URL`, Entra redirect URI
- [install-pwa.md](docs/deployment/install-pwa.md): installing the PWA, the offline screen, service worker updates
- [push-notifications.md](docs/deployment/push-notifications.md): VAPID keys, enabling a device, troubleshooting
- [worker.md](docs/deployment/worker.md): the two background jobs and how they stay safe across restarts
- [assignment-migration.md](docs/deployment/assignment-migration.md): backup, migrate and roll back the Assignment model change
- [manual-verification.md](docs/deployment/manual-verification.md): the real-device checklist to run after deploying
