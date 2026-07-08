import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { syncBlackboardCalendarForUser } from "@/lib/ical/sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const icsUrl = process.env.BLACKBOARD_ICS_URL;
  if (!icsUrl) {
    return NextResponse.json({ error: "BLACKBOARD_ICS_URL is not configured" }, { status: 400 });
  }

  const result = await syncBlackboardCalendarForUser(session.user.id, icsUrl);
  return NextResponse.json(result);
}
