/**
 * Web Push VAPID configuration, read from server environment variables (never NEXT_PUBLIC_*,
 * which Next inlines at build time; the public key reaches the browser as a prop instead).
 *
 * Generate the pair ONCE and keep it stable: every stored push subscription is bound to the
 * public key it was created with, so rotating the keys silently breaks all registered devices.
 * See docs/deployment/push-notifications.md.
 */
export type VapidConfig =
  | { ok: true; publicKey: string; privateKey: string; subject: string }
  | { ok: false; error: string };

type Env = Record<string, string | undefined>;

const SUBJECT_HELP =
  "Set VAPID_SUBJECT to mailto:you@example.com (or an https:// URL); push services reject anything else.";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function readVapidConfig(env: Env = process.env): VapidConfig {
  const publicKey = clean(env.VAPID_PUBLIC_KEY);
  const privateKey = clean(env.VAPID_PRIVATE_KEY);
  if (!publicKey || !privateKey) {
    return {
      ok: false,
      error:
        "Push isn't set up on the server: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are missing. See docs/deployment/push-notifications.md.",
    };
  }

  // The subject identifies the sender to the push service: a mailto: address or an https URL.
  const candidates = [clean(env.VAPID_SUBJECT), clean(env.AUTH_URL)];
  const subject = candidates.find((s) => s && (s.startsWith("mailto:") || s.startsWith("https://")));
  if (!subject) {
    return { ok: false, error: `Push has no usable VAPID subject. ${SUBJECT_HELP}` };
  }
  return { ok: true, publicKey, privateKey, subject };
}
