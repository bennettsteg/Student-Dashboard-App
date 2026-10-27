"use server";

import { revalidatePath } from "next/cache";

import {
  addCategory,
  addEntry,
  categoryDeleteImpact,
  deleteCategory,
  deleteEntry,
  updateCategory,
  updateEntry,
} from "@/lib/grades/store";
import {
  parseCategoryInput,
  parseEntryInput,
  type CategoryInput,
  type EntryInput,
} from "@/lib/grades/validation";
import { requireUserId } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND: ActionResult = { ok: false, error: "That course or item no longer exists." };

/** Grades show on the Course detail page (a child of /courses) and on the Course cards. */
function revalidateGrades() {
  revalidatePath("/courses", "layout");
  revalidatePath("/");
}

function result(changed: boolean): ActionResult {
  if (!changed) return NOT_FOUND;
  revalidateGrades();
  return { ok: true };
}

export async function addGradeCategory(
  courseId: string,
  input: CategoryInput,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = parseCategoryInput(input);
  if (!parsed.ok) return parsed;
  return result((await addCategory(userId, courseId, parsed.value)) !== null);
}

export async function updateGradeCategory(
  categoryId: string,
  input: CategoryInput,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = parseCategoryInput(input);
  if (!parsed.ok) return parsed;
  return result(await updateCategory(userId, categoryId, parsed.value));
}

/** How many Grade Entries deleting this Category would also delete, for its confirmation. */
export async function getGradeCategoryDeleteImpact(
  categoryId: string,
): Promise<{ entries: number } | null> {
  const userId = await requireUserId();
  return categoryDeleteImpact(userId, categoryId);
}

/** Deletes a Grade Category; its Grade Entries are deleted with it. */
export async function deleteGradeCategory(categoryId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  return result(await deleteCategory(userId, categoryId));
}

export async function addGradeEntry(courseId: string, input: EntryInput): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = parseEntryInput(input);
  if (!parsed.ok) return parsed;
  return result(await addEntry(userId, courseId, parsed.value));
}

export async function updateGradeEntry(
  entryId: string,
  input: EntryInput,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = parseEntryInput(input);
  if (!parsed.ok) return parsed;
  return result(await updateEntry(userId, entryId, parsed.value));
}

export async function deleteGradeEntry(entryId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  return result(await deleteEntry(userId, entryId));
}
