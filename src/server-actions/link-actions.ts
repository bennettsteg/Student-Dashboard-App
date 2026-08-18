"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/session";

async function requireUserId() {
  const userId = await resolveUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export interface LinkInput {
  name: string;
  url: string;
}

export async function createLink(input: LinkInput) {
  const userId = await requireUserId();

  await prisma.link.create({
    data: {
      userId,
      name: input.name.trim(),
      url: normalizeUrl(input.url),
    },
  });

  revalidatePath("/links");
}

export async function deleteLink(id: string) {
  const userId = await requireUserId();

  await prisma.link.deleteMany({ where: { id, userId } });

  revalidatePath("/links");
}
