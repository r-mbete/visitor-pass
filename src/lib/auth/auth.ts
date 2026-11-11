import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { sendSignInCode } from "./email";
import { mayReceiveCode } from "./people";

function createAuth() {
  const db = getDb();
  return betterAuth({
    appName: "Salama Pass",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    session: {
      // A week signed in, renewed daily while in use; deactivation still ends access at once (see session.ts).
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    },
    databaseHooks: {
      user: {
        create: {
          // No public sign-up (ADR 2): only someone an admin added gets a user.
          before: async (user) => mayReceiveCode(db, user.email),
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in") return;
          // Say nothing to the caller either way, so the form cannot be used to find out who lives here.
          if (!(await mayReceiveCode(db, email))) return;
          await sendSignInCode(email, otp);
        },
      }),
      // Lets server actions set the session cookie; keep it last.
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { salamaAuth?: Auth };

/** The Better Auth instance, made once per server process. */
export function getAuth(): Auth {
  globalForAuth.salamaAuth ??= createAuth();
  return globalForAuth.salamaAuth;
}
