/**
 * Current Grade: pure domain logic, no database and no clock.
 *
 * A Grade Category's score is the total points earned over the total points possible across its
 * Grade Entries. A Course's Current Grade is the weighted average of those scores over only the
 * Categories that have Grade Entries, with their weights rescaled to total 100. Nothing is
 * stored: it is derived whenever it is shown.
 */

export interface GradeEntryPoints {
  pointsEarned: number;
  pointsPossible: number;
}

export interface GradeCategoryScoring {
  /** Percentage weight (0 to 100, decimals allowed). */
  weight: number;
  entries: GradeEntryPoints[];
}

/** A Grade Category's score as a percentage, or null when it has no Grade Entries. */
export function categoryScore(entries: GradeEntryPoints[]): number | null {
  if (entries.length === 0) return null;
  let earned = 0;
  let possible = 0;
  for (const entry of entries) {
    earned += entry.pointsEarned;
    possible += entry.pointsPossible;
  }
  // Points possible are required to be greater than zero, so `possible` is positive.
  return possible > 0 ? (earned / possible) * 100 : null;
}

/**
 * A Course's Current Grade as a percentage, or null when no Grade Category has a Grade Entry
 * (shown as a dash, never as 0%). Also null in the degenerate case where every Category that
 * has entries has zero weight, since there is nothing to weight the scores by.
 */
export function currentGrade(categories: GradeCategoryScoring[]): number | null {
  let weighted = 0;
  let weights = 0;
  for (const category of categories) {
    const score = categoryScore(category.entries);
    if (score === null) continue;
    weighted += category.weight * score;
    weights += category.weight;
  }
  return weights > 0 ? weighted / weights : null;
}

/** The total of the Grade Scheme's weights; the UI warns when it is not 100. */
export function weightTotal(categories: Array<{ weight: number }>): number {
  return categories.reduce((total, category) => total + category.weight, 0);
}
