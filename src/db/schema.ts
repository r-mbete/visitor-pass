import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { ROLES } from "../lib/access/permissions";
import { ENTRY_KINDS } from "../lib/gate/types";
import { REFUSAL_REASONS } from "../lib/pass/token";

const quoted = (values: readonly string[]) =>
  values.map((v) => `'${v}'`).join(", ");

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const PASS_STATUSES = ["active", "cancelled"] as const;

export const estate = pgTable("estate", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const unit = pgTable(
  "unit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estateId: uuid("estate_id")
      .notNull()
      .references(() => estate.id),
    label: text("label").notNull(),
  },
  (t) => [unique("unit_estate_label_unique").on(t.estateId, t.label)],
);

export const person = pgTable(
  "person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estateId: uuid("estate_id")
      .notNull()
      .references(() => estate.id),
    name: text("name").notNull(),
    phone: text("phone"),
    role: text("role", { enum: ROLES }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  () => [check("person_role_check", sql.raw(`role IN (${quoted(ROLES)})`))],
);

export const residency = pgTable(
  "residency",
  {
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.unitId] }),
    index("residency_unit_idx").on(t.unitId),
  ],
);

export const pass = pgTable(
  "pass",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estateId: uuid("estate_id")
      .notNull()
      .references(() => estate.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => person.id),
    /** A lookup key for typing at the gate, not a credential (ADR 1). */
    shortCode: text("short_code").notNull(),
    visitorName: text("visitor_name").notNull(),
    visitorPhone: text("visitor_phone"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    maxUses: integer("max_uses").notNull().default(1),
    status: text("status", { enum: PASS_STATUSES }).notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("pass_estate_short_code_unique").on(t.estateId, t.shortCode),
    index("pass_estate_window_idx").on(t.estateId, t.validUntil),
    index("pass_unit_idx").on(t.unitId),
    check("pass_window_check", sql`${t.validUntil} > ${t.validFrom}`),
    check("pass_max_uses_check", sql`${t.maxUses} BETWEEN 1 AND 10`),
    check("pass_status_check", sql.raw(`status IN (${quoted(PASS_STATUSES)})`)),
  ],
);

/** What a guard device recorded at the gate. The id is made on the device, so a retried upload is a no-op. */
export const entryEvent = pgTable(
  "entry_event",
  {
    id: uuid("id").primaryKey(),
    estateId: uuid("estate_id")
      .notNull()
      .references(() => estate.id),
    passId: uuid("pass_id").references(() => pass.id),
    unitId: uuid("unit_id").references(() => unit.id),
    visitorName: text("visitor_name"),
    guardId: uuid("guard_id")
      .notNull()
      .references(() => person.id),
    deviceId: text("device_id").notNull(),
    kind: text("kind", { enum: ENTRY_KINDS }).notNull(),
    reason: text("reason", { enum: REFUSAL_REASONS }),
    deviceTime: timestamp("device_time", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("entry_event_estate_time_idx").on(t.estateId, t.deviceTime),
    index("entry_event_pass_idx").on(t.passId),
    check(
      "entry_event_kind_check",
      sql.raw(`kind IN (${quoted(ENTRY_KINDS)})`),
    ),
    // A refusal says why; an entry or exit does not.
    check(
      "entry_event_reason_check",
      sql.raw(
        `(kind = 'refusal') = (reason IS NOT NULL) AND (reason IS NULL OR reason IN (${quoted(REFUSAL_REASONS)}))`,
      ),
    ),
  ],
);
