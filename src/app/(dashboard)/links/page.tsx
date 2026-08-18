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
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-lg font-semibold">Links</h1>
      <LinksClient links={links.map((link) => ({ id: link.id, name: link.name, url: link.url }))} />
    </div>
  );
}
