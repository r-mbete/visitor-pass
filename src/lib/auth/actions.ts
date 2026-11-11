"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getAuth } from "./auth";
import { parseProfile, updateOwnProfile } from "./people";
import { getSignedIn } from "./session";

/** Ends this device's session. */
export async function signOut(): Promise<never> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login?signedOut=1");
}

/** Ends every session this person has, on every device, including this one. */
export async function signOutEverywhere(): Promise<never> {
  const requestHeaders = await headers();
  await getAuth().api.revokeSessions({ headers: requestHeaders });
  redirect("/login?signedOut=1");
}

export type ProfileState = {
  saved?: boolean;
  errors?: { name?: string; phone?: string };
  values?: { name: string; phone: string };
};

/** Saves the signed-in person's own name and phone. */
export async function saveProfile(
  _previous: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const me = await getSignedIn();
  if (!me) redirect("/login?next=/profile");
  const values = {
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
  };
  const parsed = parseProfile(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await updateOwnProfile(getDb(), me.personId, {
    name: parsed.name,
    phone: parsed.phone,
  });
  revalidatePath("/", "layout");
  return {
    saved: true,
    values: { name: parsed.name, phone: parsed.phone ?? "" },
  };
}
