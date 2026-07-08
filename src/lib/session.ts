import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/** For use in (dashboard) pages: redirects to /signin instead of throwing if the session is somehow missing. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  return session.user.id;
}
