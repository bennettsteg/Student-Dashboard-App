/** Display helpers for grades; pure, no database. */

/** A percentage rounded to `digits` decimals ("86%", "86.7%"), or a dash when there is none. */
export function formatPercent(value: number | null, digits = 0): string {
  if (value === null) return "—";
  const factor = 10 ** digits;
  return `${Math.round(value * factor) / factor}%`;
}

/** A points or weight number without trailing zeros, at most two decimals ("7.5", "40"). */
export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}
