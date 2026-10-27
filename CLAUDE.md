# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A personal, single-user student dashboard: aggregates Outlook mail (Microsoft Graph) and manually-entered courses, assignments, grades and links, with a home-page Dashboard (summary cards, next-due assignments, recent notifications, this-week strip, courses with Current Grade, header search). Built for self-hosting via Docker on a home server. Not multi-tenant, not designed for other users.

The overhaul is built: manual-only assignments with Blackboard sync removed (ADR-0001), a daily mail auto-sync from the worker (ADR-0002), and an installable PWA served over tailnet-only HTTPS with Web Push Reminders (ADR-0003). Domain language is in `CONTEXT.md` and decisions are in `docs/adr/`; operations (deploying, installing, push, the worker, migrations, the manual verification checklist) are in `docs/deployment/`, linked from `README.md`. Where this file and an ADR disagree about intent, the ADR wins; where they disagree about what the code does, this file wins.

## Commands

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build             # production build (also runs tsc)
npx tsc --noEmit           # typecheck only
npm run lint               # eslint
npm run test                # vitest run (all tests)
npx vitest run path/to/file.test.ts   # single test file
```

### Local database (no Docker on this dev machine)

There is normally no Docker available in the dev sandbox, and this repo's `docker-compose.yml` doesn't define a Postgres service anyway (see Docker below), so local iteration uses Prisma's own dev server:

```bash
npx prisma dev -d          # starts a local Postgres on 127.0.0.1:51214 (matches DATABASE_URL in .env)
npx prisma dev ls           # check if it's running
```

This local server **cannot create a shadow database**, so `prisma migrate dev` fails against it (`P1017`/`Can't reach database server` style errors are usually just this server not running — restart it). For local schema iteration use `npx prisma db push` instead. Real migration files (`prisma/migrations/`) are still required for deployment and are applied there via `prisma migrate deploy`, which doesn't need a shadow DB and works fine.

Killing background Node processes (e.g. `taskkill //IM node.exe //F`) also kills this dev Postgres — restart it before testing again.

Roughly a quarter of the test files are live-database tests (they import `prisma`; under `src/lib/{assignments,courses,grades,mail,profile,push,reminders}/`). They need `DATABASE_URL` pointing at a database with every migration applied (`npx prisma migrate deploy`), use fixed test user ids and delete their own rows, and `vitest.config.ts` runs files serially because the dev server can't serve concurrent connections. Run them against a scratch database (e.g. a separate named instance, `npx prisma dev -n <name> -d`, with `DATABASE_URL` set in the shell; dotenv doesn't override an existing variable), never one holding real data: the reminder tick test also queries every user with Reminders on.

## Architecture

### Prisma 7 specifics (this is not the Prisma you remember)

- Generator is `prisma-client` (not `prisma-client-js`), output goes to `src/generated/prisma` (gitignored, regenerated via `npx prisma generate` — never hand-edit it).
- **The generated `PrismaClient` requires a driver adapter** — there is no more "just pass a connection string" constructor. See `src/lib/db.ts`: it must be constructed as `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. Passing `datasourceUrl` or `datasources` throws a validation error.
- Datasource URL for the CLI (migrate/db push) lives in `prisma.config.ts`, not in `prisma/schema.prisma`'s `datasource` block — the schema block just declares the provider.
- `@auth/prisma-adapter`'s standard Account/Session/User/VerificationToken models are used as-is (exact field names Auth.js expects); don't rename these fields.

### Migrations

SQL files in `prisma/migrations/`, written by hand or derived from the schema (no `migrate dev` locally, see above) and checked with `prisma migrate deploy` against a scratch database. The `migrate` compose service runs `prisma migrate deploy` on every `docker compose up`, and `app` and `worker` wait for it, so a new migration reaches production the moment the stack is rebuilt. Never edit a migration that has shipped. Prefer additive migrations (new nullable column or defaulted column, new table); a destructive one (like `20261026000000_assignment_model`, which converts and drops the old `CalendarEvent` data) must tell the operator to back up first and ship a doc in `docs/deployment/` (see `assignment-migration.md`).

### Auth (`src/lib/auth.ts`)

NextAuth v5 (`next-auth@beta`), single provider (`microsoft-entra-id`), **database session strategy** (not JWT) — access/refresh tokens live in the Prisma `Account` row, not in a cookie. `AUTH_MICROSOFT_ENTRA_ID_ISSUER` is intentionally left unset so it defaults to the `common` endpoint (accepts personal + org accounts).

Scopes are `openid profile email offline_access User.Read Mail.Read` — **no `Chat.Read`**. Teams integration was dropped: the school's Entra tenant blocks user consent for Mail/Chat scopes and requires admin approval the student doesn't have. The workaround in place is that the account being signed into is the user's **personal** Microsoft account, which receives forwarded school mail via an Outlook rule — personal accounts aren't subject to that admin-consent restriction. Don't reintroduce Teams/Chat.Read without re-confirming this is still the setup.

**Signing in is optional — the dashboard never requires login.** The app is single-user and reached only over the owner's private network, so there is no login wall. `src/lib/session.ts`'s `resolveUserId()` is the single source of truth for "who is the current user" everywhere (dashboard layout, pages via its `requireUserId()` alias, every server action) — call it instead of `auth()` directly. A real NextAuth session wins if one exists; otherwise it returns the one local `User` row (preferring the user that already has a linked Microsoft `Account`, ties broken by id), creating it with the fixed id `local-user` on first visit. It always succeeds and never redirects, so pages and actions don't need their own auth guard or `session!.user.id` assertions.

Connecting Microsoft is a separate, optional step from Settings ("Connect Microsoft account", which becomes "Reconnect Microsoft" once an `Account` exists): `auth.ts` overrides the adapter's `createUser` so Auth.js reuses that same local `User` row, so data entered before connecting is never orphaned. Mail sync needs a linked `Account` row; without one it can't run. The `/signin` page still exists for that flow. The old `AUTH_DEV_BYPASS` / `dev@localhost` mechanism no longer exists in code — a leftover `AUTH_DEV_BYPASS` in `.env` does nothing.

Auth.js stores tokens only when it first links an account and never updates them when an already-linked account signs in again. `auth.ts` therefore has an `events.signIn` hook (`recordMicrosoftSignIn` in `src/lib/mail/reconnect.ts`) that writes the fresh tokens to the existing `Account` row on every Microsoft sign-in and, if mail sync was paused as needs-reconnect, clears that flag so auto-sync resumes. That is what makes Reconnect actually replace a dead refresh token; don't remove it.

Because there's no login, the network boundary is the access control. In `docker-compose.yml` the `app` service publishes port 3000 on `127.0.0.1` only. Other devices reach it exclusively through host-installed Tailscale's `tailscale serve`, which is tailnet-only HTTPS and never Funnel (ADR-0003; setup is in `docs/deployment/tailnet-https.md`). Don't widen that port binding. When deployed, `AUTH_URL` is the `https://<host>.<tailnet>.ts.net` address and must match the Entra redirect URI `<AUTH_URL>/api/auth/callback/microsoft-entra-id`. Setting `AUTH_URL` also implies Auth.js `trustHost`.

### Graph API calls: on demand, plus one daily auto-sync (`src/lib/graph/`, `src/lib/mail/`)

`token.ts` (`getValidAccessToken`) refreshes the stored access token if it's within 5 minutes of expiry, hitting Microsoft's OAuth token endpoint directly (not a Graph call); it throws `MicrosoftReconnectRequiredError` when only reconnecting Microsoft can help (no account/refresh token, or `invalid_grant`). `mail.ts` wraps the one raw Graph read (25 newest messages, including `webLink`). `src/lib/mail/sync.ts` (`runMailSync`) is the single Mail Sync code path for both triggers: it claims the sync in the per-user `MailSyncState` row (atomic conditional UPDATE, so one sync per user at a time), upserts into `NotificationItem`, and records last success / last error / needs-reconnect. A manual sync (`trigger: "manual"`) is also subject to a server-enforced 60s cooldown measured from the last *attempt* (`cooldown.ts`); an `"auto"` one is not. The `isRead` flag is app-only: taken from Outlook once when a Notification is first created, never overwritten by a later sync, and never written back to Outlook (scope stays `Mail.Read`). The server actions in `src/server-actions/notification-actions.ts` (`syncMail`, `setNotificationRead`, `markAllNotificationsRead`) are the manual entry points.

The automatic sync (ADR-0002) is the only background Graph traffic: the worker's hourly tick (`runMailAutoSyncTick` in `autoSync.ts`) calls `runMailSync(userId, { trigger: "auto" })` for each user with a Microsoft `Account` whose guard (`autoSyncGuard.ts`, pure) says a full 24 hours have passed since both `lastSuccessAt` and `lastAttemptAt` and `needsReconnect` is false. A failed sync is recorded and waits for the next window; `invalid_grant` sets `needsReconnect` and pauses auto-sync until the student reconnects. Any other automatic Graph polling needs its own justification.

### Assignments, Courses and grades

Blackboard iCal sync has been removed (ADR-0001): no feed fetching, parsing, sync route/action, worker job, or `node-ical` dependency. The old `CalendarEvent` table and its enums are gone, replaced by `Assignment` (title, optional notes, required `courseId`, `dueAt` instant, `createdAt`; cascades from both `Course` and `User`). Migration `20261026000000_assignment_model` converted the old rows, attaching course-less ones to a Course named "Unassigned (migrated)"; see `docs/deployment/assignment-migration.md`. Complete deletes the row (after a confirmation dialog), so there is no completed state. Logic is in `src/lib/assignments/`, mutations in `src/server-actions/assignment-actions.ts`.

A `Course` carries its own weekly meeting schedule (`daysOfWeek` Monday to Friday, `startTime`/`endTime` as "HH:mm"); the Schedule page just reads Courses. A Course may be unscheduled (no days and empty times, like the migrated "Unassigned (migrated)" Course) and is then not drawn on the Schedule; when days are chosen the times are required and end must be after start. Validation is `src/lib/courses/validation.ts` and create/update are `src/lib/courses/store.ts` (the actions in `course-actions.ts` are thin wrappers; `revalidateCourseViews()` in `src/lib/courses/revalidate.ts` refreshes every page that shows Courses). Deleting a Course cascades to its Assignments, Grade Categories and Grade Entries (`src/lib/courses/drop.ts` computes the impact shown in the confirm dialog). Grades live on the course detail page: `GradeCategory` (named, weighted) and `GradeEntry` (points earned / possible, standalone, not tied to an Assignment). Current Grade is derived by the pure `src/lib/grades/currentGrade.ts` and never stored; actions are in `src/server-actions/grade-actions.ts`.

Assignment status (Overdue / Due today / Due soon within 7 days / Upcoming) is never stored. `src/lib/assignments/status.ts` derives it from `dueAt`, the current time and an IANA timezone (pure functions, tested). Don't compare dates with the server's own timezone. The timezone is `User.timezone` (Settings, default `America/Chicago`). Every time-related surface uses it, never the browser's or the server's own zone: the Dashboard, the Assignments table and the shared Assignment form, the Calendar, the Course card's "Next due" and the worker's Reminder. Server components read it with `getProfile()` and pass `timeZone` down as a prop. The shared helpers live in `src/lib/time/`: `localDate`, `localTimeOfDay` and the cached `zonedFormatter` / `formatDueDay` / `formatDueTime`, plus `zonedTimeToInstant(day, time, timeZone)`, which the Assignment form uses to turn the entered due date and time into the stored instant (DST-aware: a time repeated by the autumn change takes its first occurrence, one skipped by the spring change moves forward). The only place that reads the browser timezone is Settings' "Use this device's timezone" button. Until the student saves Settings the timezone is the `America/Chicago` default (`DEFAULT_TIMEZONE`), and the Assignment form says which zone times are in and links to Settings while it is still that default. A Course's "Next due" is its earliest open Assignment, overdue included (`src/lib/courses/nextDue.ts`); the Dashboard's "Next:" under Due this week deliberately skips already-overdue work.

### Worker (`worker/index.ts`)

A separate long-running process (not part of the Next.js app). It runs exactly two interval ticks, each of which asks the database "is one due?" (guards are pure and use persisted state, so a restart can never cause an extra sync or a second Reminder; there is no sleep-until-tomorrow loop):

- **mail** — hourly plus once at startup: `runMailAutoSyncTick` (see Graph above).
- **reminders** — every 5 minutes plus once at startup: `runReminderTick` (`src/lib/reminders/tick.ts`, guard in `guard.ts`). For each user with `remindersEnabled`, once the local time in `User.timezone` reaches `reminderTime`, no Reminder has gone out for today's local date (`ReminderState.lastSentLocalDate`) and at least one Assignment is due today, it sends one count-only push to each device via `sendPushToUser` and records the date. It reads only the local database apart from the push. If no device accepts it and one failed transiently, only `ReminderState.lastFailedAt` is recorded and the guard retries 15 minutes later until the local day ends. When the date is recorded and when nothing is (no device registered, VAPID not configured) is spelled out in `docs/deployment/worker.md`.

**Run exactly one instance**; two would each evaluate the guards in the same tick and could both sync or both push. Ticks are wrapped so a slow run never overlaps the next and a failure is logged and retried on the next interval. Run directly with `tsx` (resolves the `@/*` tsconfig path alias fine); it is not bundled by Next and needs the *full* `node_modules`, unlike the app's pruned standalone output. It needs `DATABASE_URL`, the Microsoft client id/secret (it refreshes the token itself) and the three `VAPID_*` variables; `AUTH_URL` is only the VAPID subject fallback.

### PWA, service worker and push (`public/sw.js`, `src/lib/push/`)

- **Manifest and icons:** `src/app/manifest.ts` (served at `/manifest.webmanifest`; its colours mirror `--background` by hand, since a manifest can't read CSS variables), icons in `public/icons/` and `src/app/favicon.ico` generated by `scripts/generate-icons.mjs` (committed output). iOS standalone meta and the `viewport-fit=cover` / safe-area padding (`env(safe-area-inset-*)` in `globals.css` and the layouts) are in `src/app/layout.tsx`.
- **Service worker:** `public/sw.js` is a static classic script served as-is at `/sw.js` (not bundled), registered by `ServiceWorkerRegister` in production builds only. It is deliberately online-only: it precaches `/offline.html` and serves it for a navigation that fails outright or gets a 502/503/504 from the proxy (Tailscale off, app down), and caches nothing else. If `public/offline.html` changes, bump `OFFLINE_CACHE` in `sw.js`. It also handles `push` (always shows a notification, because iOS revokes permission for a worker that doesn't) and `notificationclick` (opens or focuses `/assignments`, same-origin paths only). Its pure helpers are exported through a guarded `module.exports` so `src/lib/pwa/service-worker.test.ts` can test them. `next.config.ts` serves `/sw.js` with no-cache headers and a strict CSP, and `/offline.html` with no-cache.
- **Push:** `src/lib/push/`. `vapid.ts` reads `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` from the runtime environment (never `NEXT_PUBLIC_*`; the Settings page hands the public key to the client as a prop; the subject falls back to an https `AUTH_URL`). `sendPushToUser` (`send.ts`) pushes to every enabled device, deletes subscriptions the push service reports gone (404/410), and never throws for delivery problems. `payload.ts` builds the deliberately generic, count-only text so no assignment titles pass through Apple's relay. Each device is one `PushSubscription` row, created by the "Enable reminders on this device" button; `User.remindersEnabled` is the separate overall switch. The VAPID pair must be generated once and kept stable, or every registered device silently stops receiving pushes. Server actions: `src/server-actions/push-actions.ts`. Setup and the manual checks are in `docs/deployment/push-notifications.md`.

### Docker (`docker/Dockerfile`, `docker-compose.yml`)

Two build targets, three logical uses:
- `runner` — the `app` service. Next's `output: "standalone"` traces and bundles first-party `src/` code (including the generated Prisma client) directly into `.next/server` chunks, so **no manual copying of `src/generated/prisma` into the image is needed** — verified by running the standalone server directly. `public/` (including `sw.js`, `offline.html` and the icons) is copied next to `server.js`.
- `builder` — has full `node_modules` + source, reused as-is for both the one-shot `migrate` service (`npx prisma migrate deploy`) and the long-running `worker` service (`npx tsx worker/index.ts`), just with different `command:` overrides in compose. There's no separate `Dockerfile.worker`.

Postgres is **not** a compose service: all three services join the external `database-network` and use `DATABASE_URL` from `.env`, pointing at a Postgres container that runs separately. Compose passes the Entra credentials, `AUTH_SECRET`/`AUTH_URL` and the VAPID variables to `app`, and a subset to `worker` (see Worker). A new env var read by the code must be added to the relevant service in `docker-compose.yml` as well as to `.env.example`.

### Server Actions vs. Route Handlers

Route Handlers (`src/app/api/**/route.ts`) exist only where something must be a real HTTP endpoint: NextAuth's callback and the health check (`/api/health`). Everything else that mutates data goes through `src/server-actions/*.ts` (`"use server"` files called directly from client components; assignments, courses, grades, links, notifications/mail, profile, push) — follow this split for new mutations rather than adding more route handlers. The pattern is: the action calls `requireUserId()` from `src/lib/session.ts`, delegates to a function in `src/lib/<area>/` that takes `userId` (where the logic and the tests live), then `revalidatePath`s the affected pages.

### Theme

`globals.css` defines a single dark palette (no light/dark toggle) via the shadcn CSS-variable system, sampled from the StudyDesk mockups in `design/`: warm charcoal surfaces (`--background` `#292727`, `--card`/`--sidebar` `#2e2b2b`, `--border` `#3e3a3a`), deep oxblood primary (`--primary` `#810505`, used for active nav, primary buttons, today), off-white text (`#eeebeb`, muted `#a8a1a1`), plus StudyDesk extras exposed as Tailwind colors: `highlight` (`#c68f8f` — unread dots, grade bars, text links), `due-soon`/`due-soon-foreground` (cream badge), `success`, `surface-sunken`. Typography is DM Sans via `next/font/google` (`--font-dm-sans` → Tailwind `font-sans`/`font-heading`); `h1`–`h3` default to bold. UI primitives in `src/components/ui/` (shadcn, built on `@base-ui/react`, not Radix) already consume these variables, so most restyling should happen in `globals.css`, not by hardcoding colors in components. Avoid reintroducing Tailwind's default palette classes (`zinc-*`, `blue-*`, etc.) in app code — use the theme tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, ...) instead. The Calendar is a hand-built month grid (`src/components/calendar/CalendarMonth.tsx`, geometry in `src/lib/calendar/month.ts`); there is no calendar library.

The app shell has no top header: desktop gets `Sidebar`, phones get `MobileNav` (four tabs + "More"), both driven by the eight-section list in `src/components/layout/nav.ts` (Dashboard, Assignments, Courses, Schedule, Calendar, Notifications, Links, Settings). Microsoft connection status and sign-out live in Settings.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (`bennettsteg/Student-Dashboard-App`), accessed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
