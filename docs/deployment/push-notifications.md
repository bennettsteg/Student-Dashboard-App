# Push notifications (Reminders)

StudyDesk sends Reminders with Web Push, from your own server, to the devices you enable in Settings. This page covers the one-time server setup and enabling a device. This covers the delivery plumbing and the Settings test push; when the daily digest is sent is described in [worker.md](worker.md).

Push needs the HTTPS tailnet address from [tailnet-https.md](tailnet-https.md) and, on iPhone, the installed app from [install-pwa.md](install-pwa.md).

## 1. Generate the VAPID keys (once)

VAPID keys identify your server to the push services (Apple, Google, Microsoft, Mozilla). Generate one pair and **keep it stable**: every device subscription is bound to the public key it was created with. If you change the keys, all existing devices silently stop receiving pushes and each must press "Enable reminders on this device" again.

```bash
npx web-push generate-vapid-keys
# on the server, without a local checkout:
docker compose run --rm worker npx web-push generate-vapid-keys
```

Put the output in the `.env` next to `docker-compose.yml` (never commit it):

```
VAPID_PUBLIC_KEY="<public key>"
VAPID_PRIVATE_KEY="<private key>"
VAPID_SUBJECT="mailto:you@example.com"
```

- `VAPID_SUBJECT` must be a `mailto:` address or an `https://` URL. Apple rejects pushes with an invalid subject. If it is empty, the https `AUTH_URL` is used.
- The keys are plain server environment variables, read when a page or push is served. They are not `NEXT_PUBLIC_*` and nothing is baked into the image at build time; the public key reaches the browser through the Settings page.
- Back the keys up with the rest of your `.env`.

Both the `app` service (Settings, test push) and the `worker` service (daily digest) receive them from `docker-compose.yml`. Restart after changing `.env`:

```bash
docker compose up -d app worker
```

Without keys the app still works; Settings says push isn't set up on the server.

## 2. Enable a device

1. Open StudyDesk on the device. On iPhone and iPad this must be the **installed Home Screen app**, not a Safari tab (iOS 16.4 or later).
2. Settings, **Reminders on this device**, **Enable reminders on this device**. Allow notifications when asked. The prompt only appears from this button press.
3. Press **Send test push**. A "StudyDesk: Test reminder" notification arrives; tapping it opens Assignments.

Each device is separate: enable it on the phone and on the laptop if you want both. **Turn off on this device** removes only that device. The Reminders checkbox in the profile section is the overall switch and keeps your device registrations.

If a device cannot receive pushes, Settings explains why:

| Message | Cause and fix |
| --- | --- |
| Reminders need the secure HTTPS address | Opened over plain http. Use the `https://<host>.<tailnet>.ts.net` address. |
| Only work from the installed app | iPhone/iPad Safari tab. Share, Add to Home Screen, open from the Home Screen. |
| This browser can't receive push notifications | Browser without Web Push (or iOS older than 16.4). |
| Notifications are blocked | Permission was denied. iPhone: Settings, Notifications, StudyDesk. Desktop: site settings next to the address bar. Reload afterwards. |
| Push isn't set up on the server | VAPID keys are missing or the subject is invalid (step 1). |

## Brave desktop (optional)

Brave disables push through Google's service by default, so enabling reminders in Brave fails with a "push service" message. To use Reminders in Brave desktop, turn on **Settings, Privacy and security, Use Google services for push messaging** and restart Brave. Edge and Chrome need nothing. Skip it if you only want Reminders on your phone.

## Stale devices clean themselves up

When a push service answers 404 or 410 (the device uninstalled the app, revoked permission, or the subscription expired), the server deletes that device's row. Other failures (a push service outage, a network error) keep the row and are retried on the next send.

## Sending from code

The worker's daily digest (and the Settings test push) use `sendPushToUser(userId, payload, options?)` in `src/lib/push/send.ts`. It pushes to every device the user enabled, deletes the ones the push service reports gone, never throws for a delivery problem, and returns `{ sent, removed, failed, error? }`. Build the payload with `buildReminderPayload(count)` from `src/lib/push/payload.ts`: generic and count-only, so no assignment titles pass through Apple's relay, and tapping opens `/assignments`.

## Manual verification checklist

Real push delivery needs real devices and can't be automated:

- [ ] Keys generated, in `.env`, app and worker restarted; Settings no longer says push isn't set up.
- [ ] **iPhone, installed app:** Settings, Enable reminders on this device, allow. Settings shows "Reminders are enabled on this device" and "1 device is enabled."
- [ ] **iPhone:** Send test push. The notification arrives (with the app in the background or closed) and tapping it opens Assignments.
- [ ] **iPhone, Safari tab:** Settings explains that the installed app is required.
- [ ] **iPhone:** deny the permission once (or switch it off in iOS Settings); Settings shows the blocked message with the fix.
- [ ] **Desktop Edge:** enable and send a test push; tap opens Assignments in the app window.
- [ ] **Desktop Brave:** enabling fails with the Google services message until that setting is on; works afterwards.
- [ ] Uninstall the app from the phone (or revoke its notification permission), then trigger a send from the remaining device (Send test push targets only the current device, so the daily digest is what reaches the dead one): the dead device disappears from the "devices enabled" count after the next digest.
