import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

import { LinksClient } from "./LinksClient";

export default async function LinksPage() {
  const userId = await requireUserId();

  const links = await prisma.link.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl">Links</h1>
        <p className="text-sm text-muted-foreground">Shortcuts to the school portal and other sites</p>
      </div>
      <LinksClient links={links.map((link) => ({ id: link.id, name: link.name, url: link.url }))} />
    </div>
  );
}
