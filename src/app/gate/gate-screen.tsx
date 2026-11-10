"use client";

import { ArrowPathIcon } from "@heroicons/react/20/solid";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import type { CryptoKey } from "jose";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { formatTime } from "@/lib/format";
import { checkAtGate, type GateCheck } from "@/lib/gate/check";
import type { GateBundle, GateEventInput } from "@/lib/gate/types";
import { importPublicKeys } from "@/lib/pass/keys";
import type { PassClaims, RefusalReason } from "@/lib/pass/token";

type Props = { bundle: GateBundle; guardName: string };

type Screen =
  | { step: "ready" }
  | { step: "checked"; check: GateCheck }
  | { step: "saving"; check: GateCheck }
  | { step: "done"; message: string }
  | { step: "failed"; check: GateCheck; message: string };

const at = (seconds: number) => formatTime(seconds * 1000);

function refusalText(reason: RefusalReason, pass?: PassClaims): string {
  switch (reason) {
    case "unreadable":
      return "This is not a valid pass.";
    case "unknown_key":
      return "This pass was not issued by this estate.";
    case "bad_signature":
      return "This pass has been altered or forged.";
    case "wrong_estate":
      return "This pass is for a different estate.";
    case "not_yet_valid":
      return pass
        ? `Not valid yet. It starts at ${at(pass.validFrom)}.`
        : "Not valid yet.";
    case "expired":
      return pass ? `Expired at ${at(pass.validUntil)}.` : "Expired.";
    case "cancelled":
      return "The resident cancelled this pass.";
    case "used_up":
      return pass && pass.maxUses > 1
        ? `All ${pass.maxUses} entries have been used.`
        : "This pass has already been used.";
  }
}

/** A stable id for this browser, so the log can tell gate phones apart. */
function deviceId(): string {
  try {
    const saved = localStorage.getItem("salama.deviceId");
    if (saved) return saved;
    const made = `web-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("salama.deviceId", made);
    return made;
  } catch {
    return "web-unsaved";
  }
}

export function GateScreen({ bundle, guardName }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const [keys, setKeys] = useState<Map<string, CryptoKey>>();
  const [usedSince, setUsedSince] = useState<Record<string, number>>({});
  const [screen, setScreen] = useState<Screen>({ step: "ready" });

  useEffect(() => {
    importPublicKeys(bundle.keys).then(setKeys);
  }, [bundle.keys]);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!keys) return;
    const result = await checkAtGate(
      typed,
      bundle,
      keys,
      { usedSince },
      new Date(),
    );
    setScreen(
      result.kind === "empty"
        ? { step: "ready" }
        : { step: "checked", check: result },
    );
  }

  function reset() {
    setTyped("");
    setScreen({ step: "ready" });
    input.current?.focus();
  }

  async function record(check: GateCheck) {
    if (check.kind !== "checked") return;
    const { result } = check;
    const pass = result.pass;
    const event: GateEventInput = {
      id: crypto.randomUUID(),
      passId: pass?.passId ?? null,
      unitId: pass?.unitId ?? null,
      visitorName: pass?.visitorName ?? null,
      kind: result.ok ? "entry" : "refusal",
      reason: result.ok ? null : result.reason,
      deviceId: deviceId(),
      deviceTime: new Date().toISOString(),
    };
    // A refusal for a pass this estate never issued names a pass the server does not know.
    if (
      !result.ok &&
      ["unreadable", "unknown_key", "bad_signature", "wrong_estate"].includes(
        result.reason,
      )
    ) {
      event.passId = null;
      event.unitId = null;
    }
    setScreen({ step: "saving", check });
    try {
      const response = await fetch("/api/gate/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [event] }),
      });
      const body = (await response.json()) as { accepted?: string[] };
      if (!response.ok || !body.accepted?.includes(event.id))
        throw new Error("not accepted");
    } catch {
      setScreen({
        step: "failed",
        check,
        message: "Could not save. Check the connection and try again.",
      });
      return;
    }
    if (result.ok)
      setUsedSince((u) => ({
        ...u,
        [result.pass.passId]: (u[result.pass.passId] ?? 0) + 1,
      }));
    setTyped("");
    setScreen({
      step: "done",
      message: result.ok
        ? `Entry recorded: ${result.pass.visitorName} to ${result.pass.unitLabel}.`
        : "Refusal recorded.",
    });
    input.current?.focus();
  }

  const shown =
    screen.step === "checked" ||
    screen.step === "saving" ||
    screen.step === "failed"
      ? screen.check
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={bundle.estateName}
        title="Gate"
        description={`On duty: ${guardName}`}
        action={
          <button
            type="button"
            onClick={() => router.refresh()}
            className="border-ink flex items-center gap-2 rounded-md border-2 px-4 py-2 font-medium"
          >
            <ArrowPathIcon className="size-5" />
            Update passes
          </button>
        }
      />

      <form onSubmit={check} className="flex flex-col gap-3">
        <label htmlFor="code" className="text-lg font-medium">
          Pass code
        </label>
        <div className="flex gap-3">
          <input
            id="code"
            ref={input}
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              if (screen.step !== "saving") setScreen({ step: "ready" });
            }}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCD-2345"
            aria-describedby="code-help"
            className="border-ink min-w-0 flex-1 rounded-md border-2 bg-white px-4 py-3 font-mono text-2xl tracking-widest uppercase"
          />
          <button
            type="submit"
            disabled={!keys || screen.step === "saving"}
            className="bg-ink text-shell rounded-md px-6 py-3 text-lg font-semibold disabled:opacity-50"
          >
            Check
          </button>
        </div>
        <p id="code-help" className="text-muted text-sm">
          The 8-character code on the visitor&apos;s pass. Camera scanning comes
          next.
        </p>
      </form>

      <div aria-live="polite" className="min-h-48">
        {screen.step === "done" && (
          <p className="border-admit text-admit flex items-center gap-2 rounded-md border-2 px-4 py-3 text-lg font-medium">
            <CheckCircleIcon className="size-6 shrink-0" />
            {screen.message}
          </p>
        )}
        {shown && <Outcome check={shown} />}
        {shown?.kind === "checked" && (
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => record(shown)}
              disabled={screen.step === "saving"}
              className={`${shown.result.ok ? "bg-admit" : "bg-refuse"} text-shell flex-1 rounded-md px-6 py-4 text-lg font-semibold disabled:opacity-50`}
            >
              {screen.step === "saving"
                ? "Saving…"
                : shown.result.ok
                  ? "Admit and record entry"
                  : "Record refusal"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="border-ink rounded-md border-2 px-6 py-4 text-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        )}
        {screen.step === "failed" && (
          <p role="alert" className="text-refuse mt-3 font-medium">
            {screen.message}
          </p>
        )}
      </div>

      <p className="text-muted mt-auto text-sm">
        Passes last updated at {formatTime(new Date(bundle.builtAt))}.{" "}
        {bundle.passes.length} passes on this device.
      </p>
    </div>
  );
}

function Outcome({ check }: { check: GateCheck }) {
  if (check.kind === "not_a_code")
    return (
      <Panel tone="warn" title="Not a pass code">
        Codes have 8 letters and numbers, like GATE-2345.
      </Panel>
    );
  if (check.kind === "unknown_code")
    return (
      <Panel tone="warn" title="Code not found">
        No pass with this code is on this device. If it was made in the last few
        minutes, update passes and try again. Otherwise, call the resident.
      </Panel>
    );
  if (check.kind !== "checked") return null;
  const { result } = check;
  const pass = result.pass;
  return (
    <Panel
      tone={result.ok ? "admit" : "refuse"}
      title={result.ok ? "Admit" : "Refuse"}
    >
      {!result.ok && (
        <p className="text-lg font-medium">
          {refusalText(result.reason, pass)}
        </p>
      )}
      {pass && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-lg">
          <dt className="text-muted">Visitor</dt>
          <dd className="font-semibold">{pass.visitorName}</dd>
          <dt className="text-muted">Unit</dt>
          <dd className="font-semibold">{pass.unitLabel}</dd>
          <dt className="text-muted">Valid</dt>
          <dd>
            {at(pass.validFrom)} to {at(pass.validUntil)}
          </dd>
        </dl>
      )}
    </Panel>
  );
}

function Panel({
  tone,
  title,
  children,
}: {
  tone: "admit" | "refuse" | "warn";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    admit: "border-admit",
    refuse: "border-refuse",
    warn: "border-ink",
  }[tone];
  const heading = {
    admit: "bg-admit text-shell",
    refuse: "bg-refuse text-shell",
    warn: "bg-ink text-shell",
  }[tone];
  const Icon = {
    admit: CheckCircleIcon,
    refuse: XCircleIcon,
    warn: ExclamationTriangleIcon,
  }[tone];
  return (
    <section
      className={`bg-shell overflow-hidden rounded-md border-4 ${styles}`}
    >
      <h2
        className={`flex items-center gap-3 px-4 py-3 text-4xl font-bold tracking-wide uppercase ${heading}`}
      >
        <Icon className="size-10 shrink-0" />
        {title}
      </h2>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
