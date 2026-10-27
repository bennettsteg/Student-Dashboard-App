/**
 * Validation for the Settings profile and reminder preferences. Pure: nothing here reads the
 * clock, the database or the server's own timezone.
 */

export interface ProfileInput {
  name: string | null;
  program: string | null;
  termLabel: string | null;
  /** IANA timezone name, e.g. "America/New_York". */
  timezone: string;
  /** Reminder time of day in `timezone`, 24-hour "HH:mm". */
  reminderTime: string;
  remindersEnabled: boolean;
}

export type ProfileParseResult = { ok: true; value: ProfileInput } | { ok: false; error: string };

/**
 * The timezone a new user starts with, until the student saves Settings. Mirrors the
 * `User.timezone` column default in `prisma/schema.prisma`.
 */
export const DEFAULT_TIMEZONE = "America/Chicago";

const MAX_TEXT_LENGTH = 100;

/** True for an IANA timezone name the runtime knows (not an offset like "+05:00"). */
export function isValidTimeZone(value: string): boolean {
  const name = value.trim();
  if (name === "" || /^[+-]/.test(name)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

/** True for a zero-padded 24-hour "HH:mm" time of day. */
export function isValidTimeOfDay(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

const TEXT_FIELDS = [
  ["name", "Name"],
  ["program", "Program"],
  ["termLabel", "Term"],
] as const;

/** Trims and validates what the Settings form submits; blank text fields become null. */
export function parseProfileInput(input: ProfileInput): ProfileParseResult {
  const cleaned = {
    name: cleanText(input.name),
    program: cleanText(input.program),
    termLabel: cleanText(input.termLabel),
  };

  for (const [key, label] of TEXT_FIELDS) {
    if ((cleaned[key]?.length ?? 0) > MAX_TEXT_LENGTH) {
      return { ok: false, error: `${label} must be ${MAX_TEXT_LENGTH} characters or fewer.` };
    }
  }

  const timezone = input.timezone.trim();
  if (!isValidTimeZone(timezone)) {
    return { ok: false, error: "Choose a valid timezone." };
  }
  if (!isValidTimeOfDay(input.reminderTime)) {
    return { ok: false, error: "Enter the reminder time as HH:mm (00:00-23:59)." };
  }

  return {
    ok: true,
    value: {
      ...cleaned,
      timezone,
      reminderTime: input.reminderTime,
      remindersEnabled: input.remindersEnabled,
    },
  };
}
