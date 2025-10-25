import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/db/crypto-edge";
import { createGuestUser, getUser } from "@/lib/db/queries";
import { generateDummyPassword } from "@/lib/db/utils";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  // biome-ignore lint/nursery/useConsistentTypeDefinitions: "Required"
  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);

        if (users.length === 0) {
          // Timing attack prevention: run dummy password check
          const dummyPassword = await generateDummyPassword();
          await verifyPassword(password, dummyPassword);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          // Timing attack prevention: run dummy password check
          const dummyPassword = await generateDummyPassword();
          await verifyPassword(password, dummyPassword);
          return null;
        }

        const passwordsMatch = await verifyPassword(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return { ...user, type: "regular" };
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" };
      },
    }),
  ],
});
