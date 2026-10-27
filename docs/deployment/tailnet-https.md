# HTTPS on the tailnet

The app is served over HTTPS **on the tailnet only**, using `tailscale serve` on the home server (ADR-0003). HTTPS is what lets the app be installed as a PWA and use service workers and Web Push. The app has no login, so it must never be reachable outside the tailnet. The network boundary is the only access control.

**Tailscale Funnel is deliberately not used, and neither is any other public exposure** (port forwarding, Cloudflare Tunnel, a public reverse proxy). Funnel would publish the app to the whole internet, and anyone who found the URL would have full access to the dashboard. Don't turn it on.

## How it fits together

```
phone / desktop (Tailscale on)
   │  https://<host>.<tailnet>.ts.net   (Let's Encrypt cert issued via Tailscale)
   ▼
tailscaled on the home server  ── tailscale serve, port 443, tailnet only
   │  http://127.0.0.1:3000
   ▼
docker compose `app` container  (published on 127.0.0.1 only, not on the LAN)
```

- Tailscale runs **on the host**, not in a container. `docker-compose.yml` publishes the app as `127.0.0.1:3000:3000`, so plain HTTP is reachable only from the server itself. Tailscale serve is the only way in from other devices.
- Why not a Tailscale sidecar container? It would need its own auth key, a persistent state volume, and `network_mode` sharing with the app. That's more moving parts for the same result, and the host already runs Tailscale for SSH and admin access.
- Auth.js builds the Microsoft redirect URI from `AUTH_URL`. Setting `AUTH_URL` also makes Auth.js trust the proxied host, so `AUTH_TRUST_HOST` is not needed. `tailscale serve` keeps the original `Host` header and adds `X-Forwarded-*` headers, so Next.js Server Actions' same-origin check passes without any `serverActions.allowedOrigins` config.

## One-time setup

### 1. Install Tailscale on the server

Follow <https://tailscale.com/download/linux> (for example `curl -fsSL https://tailscale.com/install.sh | sh`), then:

```bash
sudo tailscale up
tailscale status            # the server should be listed with a 100.x.y.z address
```

Phones and desktops that will use the app need the Tailscale client too, signed in to the same tailnet.

### 2. Enable MagicDNS and HTTPS certificates

In the Tailscale admin console go to **DNS** (<https://login.tailscale.com/admin/dns>):

1. Enable **MagicDNS**.
2. Under **HTTPS Certificates**, click **Enable HTTPS**.
3. Note your tailnet DNS name (for example `tail1234.ts.net`). The server's address will be `https://<host>.<tailnet>.ts.net`, where `<host>` is the machine name shown in `tailscale status`.

Certificate names are published in public Certificate Transparency logs, so the hostname `<host>.<tailnet>.ts.net` is publicly *visible*. That's expected and harmless: the name only resolves and connects from inside the tailnet. Avoid putting anything sensitive in the machine name.

### 3. Point the app at the new address

In the server's `.env`:

```bash
AUTH_URL="https://<host>.<tailnet>.ts.net"   # no trailing slash, no port
```

Then recreate the app container so it picks up the new value, and confirm it's listening on loopback only:

```bash
docker compose up -d --build app
curl -sI http://127.0.0.1:3000/api/health   # should return 200
```

### 4. Start `tailscale serve`

```bash
sudo tailscale serve --bg http://127.0.0.1:3000
tailscale serve status
```

`--bg` makes the config persistent. It's saved in tailscaled's state and survives reboots and Tailscale restarts. By default it serves HTTPS on port 443 to the tailnet only. `tailscale serve status` should show `https://<host>.<tailnet>.ts.net (tailnet only)` proxying to `http://127.0.0.1:3000`. The first request may take a few seconds while the certificate is issued.

To remove it later: `sudo tailscale serve reset`.

Make sure Funnel is off:

```bash
tailscale funnel status     # must not list this server/port as "Funnel on"
```

### 5. Update the Microsoft Entra redirect URI

Do this together with step 3. If `AUTH_URL` and the redirect URI disagree, "Connect Microsoft" fails with `AADSTS50011: redirect URI mismatch`.

1. Go to <https://entra.microsoft.com> (or the Azure portal), then **App registrations**, then this app, then **Authentication**.
2. Under the **Web** platform, add the redirect URI:

   ```
   https://<host>.<tailnet>.ts.net/api/auth/callback/microsoft-entra-id
   ```

3. Remove the old deployed redirect URI (the previous `http://...` address). You can keep `http://localhost:3000/api/auth/callback/microsoft-entra-id` for local development.
4. Save.

The client ID and secret don't change.

### 6. Reconnect Microsoft if needed

The stored Microsoft `Account` row (and its refresh token) survives the address change, so mail sync should keep working without doing anything. The browser session cookie for the old `http://` address doesn't carry over to the new origin. That doesn't matter because the dashboard never requires login. If mail sync reports a token problem, use **Settings → Connect Microsoft account** at the new address.

## Verification checklist

These checks need real devices and the real tailnet, so they are done by hand. The list (valid certificate on desktop and phone, Connect Microsoft over HTTPS, unreachable off the tailnet, port bound to loopback only, Funnel off) is section 1 of [manual-verification.md](manual-verification.md), where results are recorded.

## Troubleshooting

- **`AADSTS50011` redirect URI mismatch:** the Entra redirect URI doesn't exactly match `<AUTH_URL>/api/auth/callback/microsoft-entra-id`. Check scheme, hostname, and trailing slashes, and make sure the container was recreated after editing `.env`.
- **Server Action fails with an origin mismatch:** something between the browser and Next.js is rewriting the `Host` header. With plain `tailscale serve` this shouldn't happen. If it does, add `experimental.serverActions.allowedOrigins: ["<host>.<tailnet>.ts.net"]` to `next.config.ts`.
- **Certificate error on first load:** HTTPS certificates aren't enabled in the admin console (step 2), or the cert is still being issued. Retry after a few seconds.
