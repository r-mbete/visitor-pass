import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import { type AppPage, homeFor, pageAllows } from "../access/pages";
import { getAuth } from "./auth";
import { personForUser, type SignedIn } from "./people";

/** The signed-in, active person for this request, or null. Checked against the database every time, so deactivation is immediate. */
export const getSignedIn = cache(async (): Promise<SignedIn | null> => {
  if (!process.env.DATABASE_URL) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return personForUser(getDb(), session.user);
});

/** For a page: the signed-in person, or a redirect to sign in, or to their own home page if this one is not for their role. */
export async function requirePage(page: AppPage): Promise<SignedIn> {
  const me = await getSignedIn();
  if (!me) redirect(`/login?next=${encodeURIComponent(page)}`);
  if (!pageAllows(page, me.role)) redirect(homeFor(me.role));
  return me;
}

/** For a route handler: the signed-in person behind this request, or null. */
export async function signedInFor(request: Request): Promise<SignedIn | null> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return null;
  return personForUser(getDb(), session.user);
}
