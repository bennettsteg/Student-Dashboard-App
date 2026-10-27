"use server";

import { revalidatePath } from "next/cache";

import {
  completeAssignment as completeAssignmentForUser,
  createAssignment as createAssignmentForUser,
  updateAssignment as updateAssignmentForUser,
  type AssignmentInput,
} from "@/lib/assignments/mutations";
import { resolveUserId } from "@/lib/session";

function revalidateAssignmentPages() {
  revalidatePath("/");
  revalidatePath("/assignments");
  revalidatePath("/calendar");
  revalidatePath("/courses");
}

export async function createAssignment(input: AssignmentInput) {
  await createAssignmentForUser(await resolveUserId(), input);
  revalidateAssignmentPages();
}

export async function updateAssignment(id: string, input: AssignmentInput) {
  await updateAssignmentForUser(await resolveUserId(), id, input);
  revalidateAssignmentPages();
}

/** Complete: the Assignment is permanently deleted. Callers must confirm first. */
export async function completeAssignment(id: string) {
  await completeAssignmentForUser(await resolveUserId(), id);
  revalidateAssignmentPages();
}
