import { prisma } from "@/lib/db";

import { parseProfileInput, type ProfileInput } from "./validation";

export interface Profile extends ProfileInput {
  /** The connected Microsoft account's address. Read-only: no input path writes it. */
  email: string | null;
}

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export async function getProfile(userId: string): Promise<Profile> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      program: true,
      termLabel: true,
      timezone: true,
      reminderTime: true,
      remindersEnabled: true,
    },
  });
  return user;
}

/** Validates and saves the Settings profile and reminder preferences. Never touches email. */
export async function updateProfile(
  userId: string,
  input: ProfileInput,
): Promise<UpdateProfileResult> {
  const parsed = parseProfileInput(input);
  if (!parsed.ok) return parsed;

  await prisma.user.update({ where: { id: userId }, data: parsed.value });
  return { ok: true };
}
