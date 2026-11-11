import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_ESTATE_ID, PEOPLE, seedDemoEstate } from "@/db/demo-estate";
import * as schema from "@/db/schema";
import { createTestDb, resetTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { mayReceiveCode, parseProfile, personForUser } from "./people";

let db: Db;

const addUser = async (id: string, email: string) => {
  await db.insert(schema.user).values({ id, name: email, email });
  return { id, email };
};

beforeEach(async () => {
  db ??= await createTestDb();
  await resetTestDb(db);
  await seedDemoEstate(db);
});

describe("who may be sent a sign-in code", () => {
  it("allows an active person, whatever the case or spacing of the email", async () => {
    expect(await mayReceiveCode(db, "  Juma@Mvule.example ")).toBe(true);
  });

  it("refuses an email no admin has added", async () => {
    expect(await mayReceiveCode(db, "stranger@example.com")).toBe(false);
  });

  it("refuses a deactivated person", async () => {
    expect(await mayReceiveCode(db, PEOPLE.samuel.email)).toBe(false);
  });
});

describe("the person behind a signed-in user", () => {
  it("links the user to the person with that email on first sign-in, then follows the link", async () => {
    const user = await addUser("u-juma", PEOPLE.juma.email);
    const first = await personForUser(db, user);
    expect(first).toMatchObject({
      personId: PEOPLE.juma.id,
      role: "guard",
      estateId: DEMO_ESTATE_ID,
      name: "Juma Hassan",
      unitLabels: [],
    });
    const [row] = await db
      .select({ userId: schema.person.userId })
      .from(schema.person)
      .where(eq(schema.person.id, PEOPLE.juma.id));
    expect(row?.userId).toBe("u-juma");
    // The link holds even if the user's email later differs.
    expect(
      await personForUser(db, { id: "u-juma", email: "other@example.com" }),
    ).toMatchObject({ personId: PEOPLE.juma.id });
  });

  it("gives a resident their units", async () => {
    const user = await addUser("u-wanjiru", PEOPLE.wanjiru.email);
    expect(await personForUser(db, user)).toMatchObject({
      role: "resident",
      unitLabels: ["A1"],
    });
  });

  it("does not hand a person already linked to one user to another", async () => {
    await personForUser(db, await addUser("u-1", PEOPLE.juma.email));
    expect(
      await personForUser(db, { id: "u-2", email: PEOPLE.juma.email }),
    ).toBeNull();
  });

  it("returns nobody for a user with no matching person", async () => {
    const user = await addUser("u-x", "stranger@example.com");
    expect(await personForUser(db, user)).toBeNull();
  });

  it("locks a person out as soon as they are deactivated", async () => {
    const user = await addUser("u-juma", PEOPLE.juma.email);
    expect(await personForUser(db, user)).not.toBeNull();
    await db
      .update(schema.person)
      .set({ active: false })
      .where(eq(schema.person.id, PEOPLE.juma.id));
    expect(await personForUser(db, user)).toBeNull();
  });
});

describe("the profile form", () => {
  it("trims the name and tidies the phone number", () => {
    expect(parseProfile({ name: "  Juma  ", phone: "0712 345-678" })).toEqual({
      ok: true,
      name: "Juma",
      phone: "0712345678",
    });
  });

  it("treats an empty phone as none", () => {
    expect(parseProfile({ name: "Juma", phone: "" })).toMatchObject({
      phone: null,
    });
  });

  it("says what is wrong with each field", () => {
    expect(parseProfile({ name: " ", phone: "call me" })).toEqual({
      ok: false,
      errors: {
        name: "Enter your name.",
        phone: "Enter a phone number like 0712 345 678 or +254 712 345 678.",
      },
    });
  });
});
