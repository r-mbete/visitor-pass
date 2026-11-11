"use client";

import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useActionState } from "react";
import { type ProfileState, saveProfile } from "@/lib/auth/actions";

const FIELD =
  "border-line focus:border-brand bg-shell w-full rounded-xl border-2 px-4 py-3";

/** The details a person may change about themselves. */
export function ProfileForm({
  name,
  phone,
}: {
  name: string;
  phone: string | null;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    saveProfile,
    { values: { name, phone: phone ?? "" } },
  );
  const values = state.values ?? { name, phone: phone ?? "" };
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="font-semibold">
          Name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          defaultValue={values.name}
          key={`name-${values.name}`}
          aria-invalid={state.errors?.name ? true : undefined}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          className={FIELD}
        />
        {state.errors?.name && (
          <p id="name-error" className="text-refuse text-sm font-medium">
            {state.errors.name}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="font-semibold">
          Phone <span className="text-muted font-normal">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0712 345 678"
          defaultValue={values.phone}
          key={`phone-${values.phone}`}
          aria-invalid={state.errors?.phone ? true : undefined}
          aria-describedby={state.errors?.phone ? "phone-error" : "phone-help"}
          className={FIELD}
        />
        {state.errors?.phone ? (
          <p id="phone-error" className="text-refuse text-sm font-medium">
            {state.errors.phone}
          </p>
        ) : (
          <p id="phone-help" className="text-muted text-sm">
            So the gate can call you about a visitor.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-shell hover:bg-brand-deep rounded-xl px-5 py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <p
          role="status"
          className="text-admit flex items-center gap-1 font-medium"
        >
          {state.saved && !pending && (
            <>
              <CheckCircleIcon className="size-5" />
              Saved
            </>
          )}
        </p>
      </div>
    </form>
  );
}
