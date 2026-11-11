import "server-only";

/**
 * Delivers a sign-in code. No email provider is chosen yet (ADR 2), so in development the code is
 * printed in the dev server's terminal, and in production sign-in fails loudly instead of silently.
 */
export async function sendSignInCode(email: string, code: string) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`\n[sign-in] Code for ${email}: ${code}\n`);
    return;
  }
  throw new Error(
    "No email provider is configured, so sign-in codes cannot be sent.",
  );
}
