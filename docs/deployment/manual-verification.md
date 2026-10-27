# Manual verification checklist

**Status: partly run.** Items 1.3 to 1.9 (the HTTPS and tailnet checks) were ticked off by the student before this checklist replaced the one in tailnet-https.md; everything else is not yet run. Every item below needs a real device, the real tailnet or the real server, so none of it could be run or checked in development, and no other result has been recorded. This is the checklist for GitHub issue #17 (Docs refresh and manual verification). The student runs it after deploying and fills in the Result column (pass, fail, or what happened) and the date. Do not mark an item as run until you have actually done it.

Automated checks (typecheck, lint, tests, production build) do not replace any of this; they are run separately.

How to use it: work top to bottom (later sections assume the earlier setup), change **Not yet run** to **Pass** or **Fail** as you go, and write what you saw in **Result**. If something fails, the troubleshooting tables in [tailnet-https.md](tailnet-https.md) and [push-notifications.md](push-notifications.md) cover the common causes.

Placeholders: `<host>.<tailnet>.ts.net` is the server's tailnet address; `<server-lan-ip>` is its address on your home network.

## 1. Server and tailnet

Details: [tailnet-https.md](tailnet-https.md).

| # | Check (what should happen) | Status | Result | Date |
| --- | --- | --- | --- | --- |
| 1.1 | **Migrations:** after `docker compose up -d --build`, `docker compose logs migrate` ends with "All migrations have been successfully applied.". | Not yet run | | |
| 1.2 | **Worker:** `docker compose logs worker` shows `[worker] started`, a `mail tick` line and a `reminder tick` line, and exactly one worker container is running (`docker compose ps`). | Not yet run | | |
| 1.3 | **Desktop, Tailscale on:** `https://<host>.<tailnet>.ts.net` loads the dashboard with a valid certificate (padlock, no warning). | Pass | Ticked off by the student in the old tailnet-https.md checklist before it moved here (date not recorded) | |
| 1.4 | **Phone, Tailscale on:** the same URL loads in Safari with a valid certificate. | Pass | Ticked off by the student in the old tailnet-https.md checklist before it moved here (date not recorded) | |
| 1.5 | **Connect Microsoft:** at the HTTPS address, Settings, Connect Microsoft account completes and returns to the app, and Sync mail works afterwards. (Entra redirect URI and `AUTH_URL` updated together.) | Pass | Ticked off by the student in the old tailnet-https.md checklist before it moved here (date not recorded) | |
| 1.6 | **Phone, Tailscale off, on cellular:** the URL does not load (the name does not resolve or the connection fails). | Pass | Ticked off by the student in the old tailnet-https.md checklist before it moved here (date not recorded) | |
| 1.7 | **LAN device not on Tailscale:** `curl -m 5 http://<server-lan-ip>:3000` fails (refused or timeout), and `https://<server-lan-ip>` does not serve the app. | Pass | Ticked off by the student in the old tailnet-https.md checklist before it moved here (date not recorded) | |
| 1.8 | **On the server:** `ss -ltnp \| grep 3000` shows the port bound to `127.0.0.1` only, not `0.0.0.0` or `*`. | Pass | Ticked off by the student in the old tailnet-https.md checklist before it moved here (date not recorded) | |
| 1.9 | **On the server:** `tailscale serve status` says "tailnet only", and `tailscale funnel status` shows no Funnel. | Pass | Ticked off by the student in the old tailnet-https.md checklist before it moved here (date not recorded) | |

## 2. Install the app

Details: [install-pwa.md](install-pwa.md).

| # | Check (what should happen) | Status | Result | Date |
| --- | --- | --- | --- | --- |
| 2.1 | **iPhone, Tailscale on:** Safari, Share, Add to Home Screen. The icon is the StudyDesk cap and the app opens standalone (no Safari bars). | Not yet run | | |
| 2.2 | **iPhone:** content clears the notch/Dynamic Island and the home indicator; the bottom tab bar is fully tappable. | Not yet run | | |
| 2.3 | **iPhone, Tailscale off:** opening the installed app shows the "Can't reach StudyDesk, is Tailscale on?" screen. Turning Tailscale on and tapping **Try again** loads the dashboard. | Not yet run | | |
| 2.4 | **Edge desktop:** the install option appears and the app opens in its own window. | Not yet run | | |
| 2.5 | **Brave desktop:** the install option appears and the app opens in its own window. | Not yet run | | |
| 2.6 | **Desktop DevTools, Application tab:** the manifest shows no errors, the icons (including maskable) load, and `sw.js` is "activated and running". | Not yet run | | |

## 3. Reminders (push)

Details: [push-notifications.md](push-notifications.md) and [worker.md](worker.md).

| # | Check (what should happen) | Status | Result | Date |
| --- | --- | --- | --- | --- |
| 3.1 | **Keys:** VAPID keys generated, in `.env`, app and worker restarted; Settings no longer says push isn't set up. | Not yet run | | |
| 3.2 | **iPhone, installed app:** Settings, Enable reminders on this device, allow. Settings shows "Reminders are enabled on this device" and "1 device is enabled." | Not yet run | | |
| 3.3 | **iPhone:** Send test push. The notification arrives (with the app in the background or closed) and tapping it opens Assignments. | Not yet run | | |
| 3.4 | **iPhone, Safari tab (not installed):** Settings explains that the installed app is required. | Not yet run | | |
| 3.5 | **iPhone:** deny the permission once (or switch it off in iOS Settings); Settings shows the blocked message with the fix. | Not yet run | | |
| 3.6 | **Receive a real Reminder (iPhone):** turn the Reminders switch on in Settings, set the reminder time a few minutes ahead, add an Assignment due today. Within about 5 minutes after that time the phone receives "1 assignment due today" (a count, no title) and tapping it opens Assignments. No second Reminder arrives the same day. | Not yet run | | |
| 3.7 | **Desktop Edge:** enable and send a test push; tapping it opens Assignments in the app window. | Not yet run | | |
| 3.8 | **Desktop Brave:** enabling fails with the Google services message until "Use Google services for push messaging" is on; it works afterwards (optional, only if you want Reminders in Brave). | Not yet run | | |
| 3.9 | **Stale device cleanup:** uninstall the app from the phone (or revoke its notification permission), then wait for the next daily Reminder from the remaining device (Send test push targets only the current device). The dead device disappears from the "devices enabled" count. | Not yet run | | |

## 4. Review items

These are not pass/fail checks but things the project asked the student to look over once: the new course detail page, the forms, the Overdue badge, the offline screen, the phone layouts, the "Unassigned (migrated)" Course (only present if you had assignments without a Course before the migration), and the generic push text.

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 4.1 | Course detail page and grade forms | Not yet reviewed | |
| 4.2 | Assignment forms and the Overdue badge | Not yet reviewed | |
| 4.3 | Offline screen | Not yet reviewed | |
| 4.4 | Phone layouts | Not yet reviewed | |
| 4.5 | "Unassigned (migrated)" Course: renamed or dropped | Not yet reviewed | |
| 4.6 | Generic push text is acceptable | Not yet reviewed | |
