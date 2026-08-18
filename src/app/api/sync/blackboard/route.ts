import { NextResponse } from "next/server";

import { syncBlackboardCalendarForUser } from "@/lib/ical/sync";
import { resolveUserId } from "@/lib/session";

export async function POST() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const icsUrl = process.env.BLACKBOARD_ICS_URL;
  if (!icsUrl) {
    return NextResponse.json({ error: "BLACKBOARD_ICS_URL is not configured" }, { status: 400 });
  }

  const result = await syncBlackboardCalendarForUser(userId, icsUrl);
  return NextResponse.json(result);
}
