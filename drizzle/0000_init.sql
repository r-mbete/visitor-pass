CREATE TABLE "entry_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"estate_id" uuid NOT NULL,
	"pass_id" uuid,
	"unit_id" uuid,
	"visitor_name" text,
	"guard_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"kind" text NOT NULL,
	"reason" text,
	"device_time" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_event_kind_check" CHECK (kind IN ('entry', 'exit', 'refusal')),
	CONSTRAINT "entry_event_reason_check" CHECK ((kind = 'refusal') = (reason IS NOT NULL) AND (reason IS NULL OR reason IN ('unreadable', 'unknown_key', 'bad_signature', 'wrong_estate', 'not_yet_valid', 'expired', 'cancelled', 'used_up')))
);
--> statement-breakpoint
CREATE TABLE "estate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pass" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estate_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"short_code" text NOT NULL,
	"visitor_name" text NOT NULL,
	"visitor_phone" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pass_estate_short_code_unique" UNIQUE("estate_id","short_code"),
	CONSTRAINT "pass_window_check" CHECK ("pass"."valid_until" > "pass"."valid_from"),
	CONSTRAINT "pass_max_uses_check" CHECK ("pass"."max_uses" BETWEEN 1 AND 10),
	CONSTRAINT "pass_status_check" CHECK (status IN ('active', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estate_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_role_check" CHECK (role IN ('resident', 'guard', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "residency" (
	"person_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	CONSTRAINT "residency_person_id_unit_id_pk" PRIMARY KEY("person_id","unit_id")
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estate_id" uuid NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "unit_estate_label_unique" UNIQUE("estate_id","label")
);
--> statement-breakpoint
ALTER TABLE "entry_event" ADD CONSTRAINT "entry_event_estate_id_estate_id_fk" FOREIGN KEY ("estate_id") REFERENCES "public"."estate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_event" ADD CONSTRAINT "entry_event_pass_id_pass_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."pass"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_event" ADD CONSTRAINT "entry_event_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_event" ADD CONSTRAINT "entry_event_guard_id_person_id_fk" FOREIGN KEY ("guard_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pass" ADD CONSTRAINT "pass_estate_id_estate_id_fk" FOREIGN KEY ("estate_id") REFERENCES "public"."estate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pass" ADD CONSTRAINT "pass_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pass" ADD CONSTRAINT "pass_created_by_person_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_estate_id_estate_id_fk" FOREIGN KEY ("estate_id") REFERENCES "public"."estate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residency" ADD CONSTRAINT "residency_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residency" ADD CONSTRAINT "residency_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_estate_id_estate_id_fk" FOREIGN KEY ("estate_id") REFERENCES "public"."estate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_event_estate_time_idx" ON "entry_event" USING btree ("estate_id","device_time");--> statement-breakpoint
CREATE INDEX "entry_event_pass_idx" ON "entry_event" USING btree ("pass_id");--> statement-breakpoint
CREATE INDEX "pass_estate_window_idx" ON "pass" USING btree ("estate_id","valid_until");--> statement-breakpoint
CREATE INDEX "pass_unit_idx" ON "pass" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "residency_unit_idx" ON "residency" USING btree ("unit_id");