import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/db/crypto-edge";
import { createGuestUser, getUser } from "@/lib/db/queries";
import { generateDummyPassword } from "@/lib/db/utils";
import type { UserType } from "./auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
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

        return { ...user, type: "regular" as UserType };
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" as UserType };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = (user as any).type;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = (token as any).type;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
