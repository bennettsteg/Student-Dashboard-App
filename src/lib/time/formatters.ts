/**
 * One cache of `Intl.DateTimeFormat` instances, keyed by locale, timezone and options.
 * Constructing a formatter is the expensive part of formatting a date, and every caller in
 * the app formats many instants in the same few zones.
 */

const cache = new Map<string, Intl.DateTimeFormat>();

export function zonedFormatter(
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone}|${JSON.stringify(options)}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    cache.set(key, formatter);
  }
  return formatter;
}
