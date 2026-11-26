import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";
import { sendEmail } from "./email";

// OWASP Password Storage: Argon2id, m=19 MiB, t=2, p=1.
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const auth = betterAuth({
  appName: "Vendoor × ABG",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "mysql", transaction: true }),
  user: {
    modelName: "member",
    additionalFields: {
      role: { type: "string", input: false },
      teamId: { type: "string", input: false },
      handle: { type: "string", input: false },
      status: { type: "string", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // invite-only: members are created by admins or the seed
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: (password) => hash(password, ARGON),
      verify: ({ hash: h, password }) => verify(h, password),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: "Reset your password", line: "Use the button to set a new password. The link works for 1 hour.", actionLabel: "Set new password", actionUrl: url });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days (PRD 10)
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  // On in production (stored in the DB so it survives restarts); off locally so tests can sign in repeatedly.
  rateLimit: { enabled: process.env.NODE_ENV === "production" || process.env.RATE_LIMIT === "on", storage: "database", window: 60, max: 100 },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const m = await db.member.findUnique({ where: { id: session.userId }, select: { status: true } });
          if (!m || m.status === "deactivated") return false;
          return { data: session };
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      disableSignUp: true,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, subject: "Your sign-in link", line: "Use the button to sign in. The link works once, for 15 minutes.", actionLabel: "Sign in", actionUrl: url });
      },
    }),
    nextCookies(),
  ],
  advanced: { database: { generateId: () => crypto.randomUUID() } },
});
