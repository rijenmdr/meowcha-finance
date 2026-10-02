import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clearLoginFailures, clientIp, isLoginBlocked, recordLoginFailure } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !adminPasswordHash) return null;

        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const ip = clientIp(request);
        if (isLoginBlocked(email, ip)) return null;

        const valid = email === adminEmail.toLowerCase() && (await bcrypt.compare(password, adminPasswordHash));
        if (!valid) {
          recordLoginFailure(email, ip);
          return null;
        }

        clearLoginFailures(email);
        return { id: "admin", email: adminEmail };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
