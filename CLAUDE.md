# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A personal, single-user student dashboard: aggregates Outlook mail (Microsoft Graph), a Blackboard calendar (iCal feed sync), and manually-entered courses, assignments and links, with a home-page overview of notifications / mini calendar / next-assignment-per-class. Built for self-hosting via Docker on a home server. Not multi-tenant, not designed for other users.

**An overhaul is planned and not yet implemented.** The code described below is the current state. The agreed direction is recorded in `CONTEXT.md` (domain language) and `docs/adr/`: manual-only assignments with Blackboard sync removed (ADR-0001), a daily mail auto-sync (ADR-0002), and a tailnet-only HTTPS PWA (ADR-0003). Where this file and an ADR disagree about the target, the ADR wins; where they disagree about what the code does today, this file wins.

## Commands

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build             # production build (also runs tsc)
npx tsc --noEmit           # typecheck only
npm run lint               # eslint
npm run test                # vitest run (all tests)
npx vitest run src/lib/ical/parse.test.ts   # single test file
```

### Local database (no Docker on this dev machine)

There is normally no Docker available in the dev sandbox, so local iteration uses Prisma's own dev server instead of the `postgres` service in `docker-compose.yml`:

```bash
npx prisma dev -d          # starts a local Postgres on 127.0.0.1:51214 (matches DATABASE_URL in .env)
npx prisma dev ls           # check if it's running
```

This local server **cannot create a shadow database**, so `prisma migrate dev` fails against it (`P1017`/`Can't reach database server` style errors are usually just this server not running — restart it). For local schema iteration use `npx prisma db push` instead. Real migration files (`prisma/migrations/`) are still required for deployment and are applied there via `prisma migrate deploy`, which doesn't need a shadow DB and works fine.

Killing background Node processes (e.g. `taskkill //IM node.exe //F`) also kills this dev Postgres — restart it before testing again.

## Architecture

### Prisma 7 specifics (this is not the Prisma you remember)

- Generator is `prisma-client` (not `prisma-client-js`), output goes to `src/generated/prisma` (gitignored, regenerated via `npx prisma generate` — never hand-edit it).
- **The generated `PrismaClient` requires a driver adapter** — there is no more "just pass a connection string" constructor. See `src/lib/db.ts`: it must be constructed as `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. Passing `datasourceUrl` or `datasources` throws a validation error.
- Datasource URL for the CLI (migrate/db push) lives in `prisma.config.ts`, not in `prisma/schema.prisma`'s `datasource` block — the schema block just declares the provider.
- `@auth/prisma-adapter`'s standard Account/Session/User/VerificationToken models are used as-is (exact field names Auth.js expects); don't rename these fields.

### Auth (`src/lib/auth.ts`)

NextAuth v5 (`next-auth@beta`), single provider (`microsoft-entra-id`), **database session strategy** (not JWT) — access/refresh tokens live in the Prisma `Account` row, not in a cookie. `AUTH_MICROSOFT_ENTRA_ID_ISSUER` is intentionally left unset so it defaults to the `common` endpoint (accepts personal + org accounts).

Scopes are `openid profile email offline_access User.Read Mail.Read` — **no `Chat.Read`**. Teams integration was dropped: the school's Entra tenant blocks user consent for Mail/Chat scopes and requires admin approval the student doesn't have. The workaround in place is that the account being signed into is the user's **personal** Microsoft account, which receives forwarded school mail via an Outlook rule — personal accounts aren't subject to that admin-consent restriction. Don't reintroduce Teams/Chat.Read without re-confirming this is still the setup.

**Signing in is optional — the dashboard never requires login.** The app is single-user and reached only over the owner's private network, so there is no login wall. `src/lib/session.ts`'s `resolveUserId()` is the single source of truth for "who is the current user" everywhere (dashboard layout, pages via its `requireUserId()` alias, every server action, the Blackboard sync route) — call it instead of `auth()` directly. A real NextAuth session wins if one exists; otherwise it returns the one local `User` row (preferring the user that already has a linked Microsoft `Account`, ties broken by id), creating it with the fixed id `local-user` on first visit. It always succeeds and never redirects, so pages and actions don't need their own auth guard or `session!.user.id` assertions.

Connecting Microsoft is a separate, optional step from Settings ("Connect Microsoft account"): the OAuth flow's Auth.js adapter reuses that same local `User` row, so data entered before connecting is never orphaned. Mail sync needs a linked `Account` row; without one it can't run. The `/signin` page still exists for that flow. The old `AUTH_DEV_BYPASS` / `dev@localhost` mechanism no longer exists in code — a leftover `AUTH_DEV_BYPASS` in `.env` does nothing.

### Graph API calls are on-demand only today (`src/lib/graph/`)

`token.ts` (`getValidAccessToken`) refreshes the stored access token if it's within 5 minutes of expiry, hitting Microsoft's OAuth token endpoint directly (not a Graph call). `mail.ts` wraps the raw Graph REST calls. `syncNotifications.ts` upserts fetched mail into `NotificationItem`. All of this only runs when a user explicitly clicks "Sync mail" or toggles read/unread — there is currently no background poller, to stay well under Graph rate limits for a personal app. ADR-0002 approves exactly one exception to be built in the overhaul: a once-per-24-hours auto mail sync run from the worker, guarded by a persisted last-sync time. Any other automatic Graph polling needs its own justification.

Known issue (unverified by running): the read/unread toggle PATCHes the message in Graph, but the app only requests `Mail.Read` and Graph requires `Mail.ReadWrite` to change `isRead`, so the toggle likely fails; and `syncNotifications.ts` overwrites the local `isRead` on every sync. The overhaul makes read/unread an app-only flag instead.

### Blackboard iCal sync — the highest-risk correctness code (`src/lib/ical/`)

`sync.ts`'s upsert logic is the one thing in this app that must never silently corrupt data: synced events must never clobber a user's manual edits, resyncs must be idempotent (no duplicate rows), and removed upstream events must be marked `CANCELLED`, not hard-deleted. This is enforced via `CalendarEvent` fields `source` / `externalUid` / `recurrenceId` / `lastSyncedHash` / `userModified` / `status`, and covered by `sync.test.ts` (needs a live DB) and `parse.test.ts` (pure, no DB). Read `sync.test.ts` before touching the upsert logic — it documents the exact guarantees expected.

One Prisma gotcha that shaped this design: a compound `@@unique` constraint's fields **cannot be `null`** in a `where` lookup (Prisma throws, even though Postgres itself allows distinct NULLs in unique constraints). That's why `recurrenceId` is always a non-null sentinel (`""` for non-recurring events, the occurrence's ISO start time for expanded recurring ones) rather than actually `null` — never "fix" this back to `null`.

Blackboard sync never creates or links `Course` rows. A `Course` exists only because the user created it by hand (with its weekly meeting schedule). The parsed course prefix from a Blackboard summary is kept as display-only text in `CalendarEvent.sourceCourseName`, so Blackboard events have no `courseId`. The prefix itself is a heuristic (`splitCourseAndTitle` in `parse.ts`): summaries are assumed to look like `"Course Name: Event Title"`, and text before the first `": "` is the course name. Assignment detection is also a keyword heuristic (`looksLikeAssignment`) — there's no reliable structural signal in the feed for "this is graded." Both are intentionally coarse; user edits (which set `userModified`) are the correction mechanism and survive resyncs.

This whole section is slated for removal in the overhaul (ADR-0001); don't invest in extending it.

### Worker (`worker/index.ts`)

A separate long-running process (not part of the Next.js app) that periodically calls the same `syncBlackboardCalendarForAllUsers` used by the manual "Sync now" button, via a plain `setInterval` (not cron — `SYNC_INTERVAL_MINUTES` is an arbitrary-minute interval, which doesn't map cleanly onto cron step syntax past 59). Run directly with `tsx` (resolves the `@/*` tsconfig path alias fine); it is not bundled by Next and needs the *full* `node_modules`, unlike the app's pruned standalone output.

### Docker (`docker/Dockerfile`, `docker-compose.yml`)

Two build targets, three logical uses:
- `runner` — the `app` service. Next's `output: "standalone"` traces and bundles first-party `src/` code (including the generated Prisma client) directly into `.next/server` chunks, so **no manual copying of `src/generated/prisma` into the image is needed** — verified by running the standalone server directly.
- `builder` — has full `node_modules` + source, reused as-is for both the one-shot `migrate` service (`npx prisma migrate deploy`) and the long-running `worker` service (`npx tsx worker/index.ts`), just with different `command:` overrides in compose. There's no separate `Dockerfile.worker`.

`next.config.ts` sets `serverExternalPackages: ["node-ical", "rrule-temporal", "temporal-polyfill"]` — without this, both Turbopack and webpack builds fail (`BigInt is not a function`) because `node-ical`'s `temporal-polyfill` dependency doesn't bundle cleanly. Don't remove this without re-testing a full build.

### Server Actions vs. Route Handlers

Route Handlers (`src/app/api/**/route.ts`) exist only where something must be a real HTTP endpoint: NextAuth's callback, the health check, and the Blackboard sync trigger (also callable as a plain POST). Everything else that mutates data goes through `src/server-actions/*.ts` (`"use server"` files called directly from client components) — follow this split for new mutations rather than adding more route handlers.

### Theme

`globals.css` defines a single dark palette (no light/dark toggle) via the shadcn CSS-variable system, sampled from the StudyDesk mockups in `design/`: warm charcoal surfaces (`--background` `#292727`, `--card`/`--sidebar` `#2e2b2b`, `--border` `#3e3a3a`), deep oxblood primary (`--primary` `#810505`, used for active nav, primary buttons, today), off-white text (`#eeebeb`, muted `#a8a1a1`), plus StudyDesk extras exposed as Tailwind colors: `highlight` (`#c68f8f` — unread dots, grade bars, text links), `due-soon`/`due-soon-foreground` (cream badge), `success`, `surface-sunken`. Typography is DM Sans via `next/font/google` (`--font-dm-sans` → Tailwind `font-sans`/`font-heading`); `h1`–`h3` default to bold. UI primitives in `src/components/ui/` (shadcn, built on `@base-ui/react`, not Radix) already consume these variables, so most restyling should happen in `globals.css`, not by hardcoding colors in components. Avoid reintroducing Tailwind's default palette classes (`zinc-*`, `blue-*`, etc.) in app code — use the theme tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, ...) instead. FullCalendar is reskinned via `--fc-*` CSS variables in `globals.css`, not component props.

The app shell has no top header: desktop gets `Sidebar`, phones get `MobileNav` (four tabs + "More"), both driven by the section list in `src/components/layout/nav.ts`. Microsoft connection status and sign-out live in Settings.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (`bennettsteg/Student-Dashboard-App`), accessed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
