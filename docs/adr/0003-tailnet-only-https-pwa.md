# The PWA is served over HTTPS on the tailnet only (no Funnel, no public exposure)

Installing the app, service workers and Web Push all require HTTPS, so the home server is exposed with `tailscale serve` (a tailnet-only HTTPS certificate). We rejected Tailscale Funnel and any public hosting because the app has no login: the single-user model relies on the network boundary. Consequence: devices still need Tailscale connected to load the app, though pushes themselves arrive via Apple's push relay without it, and public-endpoint features such as Graph webhooks are unavailable.
