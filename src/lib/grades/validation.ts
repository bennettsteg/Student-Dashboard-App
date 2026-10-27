/** Pure validation of Grade Category and Grade Entry input, shared by the server actions. */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface CategoryInput {
  name: string;
  /** Percentage, 0 to 100, decimals allowed. */
  weight: number;
}

export interface EntryInput {
  name: string;
  categoryId: string;
  pointsEarned: number;
  pointsPossible: number;
  /** A calendar date as "YYYY-MM-DD", or empty/null for none. */
  date?: string | null;
}

export interface ParsedEntry {
  name: string;
  categoryId: string;
  pointsEarned: number;
  pointsPossible: number;
  /** UTC midnight of the calendar date, or null. */
  date: Date | null;
}

export function parseCategoryInput(input: CategoryInput): Parsed<CategoryInput> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Enter a category name." };
  if (!Number.isFinite(input.weight) || input.weight < 0 || input.weight > 100) {
    return { ok: false, error: "Weight must be between 0 and 100." };
  }
  return { ok: true, value: { name, weight: input.weight } };
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  // Reject dates the Date constructor silently rolls over (2026-02-31).
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function parseEntryInput(input: EntryInput): Parsed<ParsedEntry> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Enter an entry name." };
  if (!input.categoryId) return { ok: false, error: "Choose a category." };
  if (!Number.isFinite(input.pointsEarned) || input.pointsEarned < 0) {
    return { ok: false, error: "Points earned must be 0 or more." };
  }
  if (!Number.isFinite(input.pointsPossible) || input.pointsPossible <= 0) {
    return { ok: false, error: "Points possible must be greater than 0." };
  }
  let date: Date | null = null;
  if (input.date) {
    date = parseDate(input.date);
    if (!date) return { ok: false, error: "Enter a valid date." };
  }
  return {
    ok: true,
    value: {
      name,
      categoryId: input.categoryId,
      pointsEarned: input.pointsEarned,
      pointsPossible: input.pointsPossible,
      date,
    },
  };
}
