import NextAuth from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db";

const prismaAdapter = PrismaAdapter(prisma);

// Single-user app: there must never be more than one User row. The dashboard can be
// browsed before ever signing in (see session.ts), which creates one local User row to
// hold whatever's synced/entered in the meantime. Without this override, the adapter
// would create a *second* row the first time "Connect Microsoft account" completes,
// silently orphaning everything under the local user. Reusing the existing row instead
// means connecting Microsoft just attaches an Account to the same user that was already
// there.
const adapter = {
  ...prismaAdapter,
  async createUser(data: AdapterUser): Promise<AdapterUser> {
    // Same selection rule as session.ts's getLocalUserId so both agree on which row is "the" user.
    const existing = await prisma.user.findFirst({
      orderBy: [{ accounts: { _count: "desc" } }, { id: "asc" }],
    });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { email: data.email, name: data.name, image: data.image },
        })
      : await prismaAdapter.createUser!(data);
    return { ...user, email: user.email ?? data.email };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: "database" },
  pages: { signIn: "/signin" },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      authorization: {
        params: {
          // Chat.Read (Teams) is dropped: it requires tenant admin consent that isn't
          // available on the school account this app targets. Mail.Read works fine
          // against a personal Microsoft account, which is what this app signs into.
          scope: "openid profile email offline_access User.Read Mail.Read",
        },
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
