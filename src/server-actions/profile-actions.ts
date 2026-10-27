"use server";

import { revalidatePath } from "next/cache";

import { updateProfile, type UpdateProfileResult } from "@/lib/profile/profile";
import type { ProfileInput } from "@/lib/profile/validation";
import { resolveUserId } from "@/lib/session";

/** Saves the Settings profile and reminder preferences (validated server-side). */
export async function saveProfile(input: ProfileInput): Promise<UpdateProfileResult> {
  const userId = await resolveUserId();
  const result = await updateProfile(userId, input);
  if (result.ok) {
    // Name and Term label appear in page headers, so every page is affected.
    revalidatePath("/", "layout");
  }
  return result;
}
