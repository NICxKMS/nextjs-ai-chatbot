import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    // Providers are added in auth.ts since they require database access
    // which is only available in Node.js runtime (not Edge)
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
