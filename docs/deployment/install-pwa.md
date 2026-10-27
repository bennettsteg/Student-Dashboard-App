# Installing StudyDesk as an app

StudyDesk is an installable PWA: it gets its own icon and opens in its own window with no browser address bar. Installing needs the HTTPS tailnet address from [tailnet-https.md](tailnet-https.md) (`https://<host>.<tailnet>.ts.net`). Over plain HTTP the browser will not offer to install. Tailscale must be connected on the device, both to install and to use the app afterwards.

## iPhone / iPad (Safari)

Requires iOS or iPadOS 16.4 or later (needed for Reminders later; installing itself works earlier). Installing is only possible from **Safari**, not from Chrome or Brave on iOS.

1. Connect Tailscale on the phone.
2. Open `https://<host>.<tailnet>.ts.net` in Safari.
3. Tap the **Share** button (square with an arrow), scroll down, tap **Add to Home Screen**.
4. Leave the name as "StudyDesk" and tap **Add**.
5. Open StudyDesk from the new cap icon on the Home Screen. It opens full-screen without Safari's bars.

Notes:

- The status bar is translucent over the app and content is padded around the notch and home indicator.
- Open the installed app, not a Safari tab, for anything that needs notification permission (Reminders).
- To reinstall after an icon or manifest change, delete the Home Screen icon and add it again. iOS keeps the old icon otherwise.

## Windows and Linux desktop (Brave or Edge)

Both are Chromium-based and install the same way.

**Edge**

1. Connect Tailscale and open `https://<host>.<tailnet>.ts.net`.
2. Menu (`...`), **Apps**, **Install this site as an app** (or click the install icon at the right end of the address bar).
3. Confirm **Install**. StudyDesk opens in its own window and gets a Start menu / app launcher entry.

**Brave**

1. Connect Tailscale and open `https://<host>.<tailnet>.ts.net`.
2. Menu (hamburger), **Save and share**, **Install StudyDesk...** (or click the install icon in the address bar).
3. Confirm **Install**. StudyDesk opens in its own window.

To uninstall, use the app window's menu (`...`), **Uninstall StudyDesk**, or remove it from your OS app list.

## Reminders (push)

Once the app is installed, enable Reminders from Settings. Server keys, per-device setup, the optional Brave desktop push setting and the push verification checklist are in [push-notifications.md](push-notifications.md).

## What happens when the server is unreachable

If the installed app can't reach the server (most often because Tailscale is off, or the server is down), it shows a "Can't reach StudyDesk, is Tailscale on?" screen instead of a blank browser error. Turn Tailscale on and tap **Try again**; the page also reloads on its own when the connection returns.

The app is online-only. The service worker caches only that one offline screen. It never stores your data and there is no offline reading or editing.

## Updating the service worker

`/sw.js` is served with `Cache-Control: no-cache`, so browsers pick up a new version on the next visit. If you change `public/offline.html`, bump `OFFLINE_CACHE` in `public/sw.js` (for example to `studydesk-offline-v2`) so installed copies drop the old page.

## Regenerating the icons

The icons are committed. After changing the logo, run `node scripts/generate-icons.mjs` (it uses `sharp`, which ships with Next) and commit the outputs in `public/icons/` and `src/app/favicon.ico`.

## Verification checklist

These need real devices and have to be done by hand:

- [ ] **iPhone, Tailscale on:** Safari, Share, Add to Home Screen. The icon is the StudyDesk cap and the app opens standalone.
- [ ] **iPhone:** content clears the notch/Dynamic Island and the home indicator; the bottom tab bar is fully tappable.
- [ ] **iPhone, Tailscale off:** opening the installed app shows the "Can't reach StudyDesk, is Tailscale on?" screen. Turning Tailscale on and tapping **Try again** loads the dashboard.
- [ ] **Edge desktop:** the install option appears and the app opens in its own window.
- [ ] **Brave desktop:** the install option appears and the app opens in its own window.
- [ ] **DevTools (desktop), Application tab:** the manifest shows no errors, the icons (including maskable) load, and `sw.js` is "activated and running".
