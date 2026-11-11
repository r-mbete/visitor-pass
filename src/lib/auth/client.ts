import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Better Auth in the browser: sends codes and signs in against /api/auth on this site. */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
