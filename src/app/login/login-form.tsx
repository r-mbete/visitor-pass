"use client";

import {
  ArrowLeftIcon,
  EnvelopeIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";

type Step =
  | { name: "email"; error?: string }
  | { name: "code"; email: string; error?: string };

const FIELD =
  "border-line focus:border-brand bg-shell w-full rounded-xl border-2 px-4 py-3 text-lg";
const BUTTON =
  "bg-brand text-shell hover:bg-brand-deep w-full rounded-xl px-5 py-3 text-lg font-semibold transition-colors disabled:opacity-50";

/** Two steps: an email address, then the 6-digit code sent to it. */
export function LoginForm({
  next,
  initialEmail = "",
}: {
  next: string | null;
  initialEmail?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "email" });
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;
    setBusy(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: address,
      type: "sign-in",
    });
    setBusy(false);
    if (error) {
      setStep({
        name: "email",
        error:
          error.status === 429
            ? "Too many codes asked for. Wait a minute and try again."
            : "The code could not be sent. Try again in a moment.",
      });
      return;
    }
    setCode("");
    setStep({ name: "code", email: address });
    requestAnimationFrame(() => codeInput.current?.focus());
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    if (step.name !== "code") return;
    setBusy(true);
    const { error } = await authClient.signIn.emailOtp({
      email: step.email,
      otp: code.replace(/\D/g, ""),
    });
    if (error) {
      setBusy(false);
      setStep({
        ...step,
        error:
          error.code === "TOO_MANY_ATTEMPTS"
            ? "Too many wrong tries. Ask for a new code."
            : "That code is wrong or has expired. Check it, or ask for a new one.",
      });
      return;
    }
    // The home page sends each person to the page their role starts on.
    router.replace(next ?? "/");
    router.refresh();
  }

  if (step.name === "email")
    return (
      <form onSubmit={sendCode} className="mt-6 flex flex-col gap-4">
        <p className="text-muted">
          We will email you a 6-digit code. There is no password to remember.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-semibold">
            Email address
          </label>
          <div className="relative">
            <EnvelopeIcon
              aria-hidden
              className="text-muted pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={step.error ? true : undefined}
              aria-describedby={step.error ? "email-error" : undefined}
              className={`${FIELD} pl-12`}
            />
          </div>
          {step.error && (
            <p
              id="email-error"
              role="alert"
              className="text-refuse font-medium"
            >
              {step.error}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className={BUTTON}>
          {busy ? "Sending…" : "Send me a code"}
        </button>
        <p className="text-muted text-sm">
          Only people your estate admin has added can sign in.
        </p>
      </form>
    );

  return (
    <form onSubmit={signIn} className="mt-6 flex flex-col gap-4">
      <p className="text-muted">
        If <strong className="text-ink">{step.email}</strong> belongs to someone
        at your estate, a code is on its way. It works for 10 minutes.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="font-semibold">
          6-digit code
        </label>
        <div className="relative">
          <KeyIcon
            aria-hidden
            className="text-muted pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
          />
          <input
            id="code"
            ref={codeInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-invalid={step.error ? true : undefined}
            aria-describedby={step.error ? "code-error" : undefined}
            className={`${FIELD} pl-12 font-mono tracking-[0.4em]`}
          />
        </div>
        {step.error && (
          <p id="code-error" role="alert" className="text-refuse font-medium">
            {step.error}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={BUTTON}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => setStep({ name: "email" })}
          className="text-brand flex items-center gap-1 font-semibold hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Use another email
        </button>
        <button
          type="button"
          onClick={sendCode}
          disabled={busy}
          className="text-accent font-semibold hover:underline disabled:opacity-50"
        >
          Send a new code
        </button>
      </div>
    </form>
  );
}
