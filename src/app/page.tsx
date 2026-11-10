import { ShieldCheckIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { demoGateEnabled } from "@/lib/gate/demo";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-8">
      <h1 className="font-display max-w-2xl text-4xl leading-tight italic sm:text-6xl">
        Visitor management for gated estates.
      </h1>
      <p className="text-muted max-w-prose text-lg">
        Residents pre-approve visitors with a signed pass. Guards check it at
        the gate, even with no signal, and every entry lands in a log that
        cannot be quietly changed.
      </p>
      {demoGateEnabled() ? (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="bg-ink text-shell flex items-center gap-2 rounded-md px-5 py-3 font-semibold"
          >
            <Squares2X2Icon className="size-5" />
            Open the dashboard
          </Link>
          <Link
            href="/gate"
            className="border-ink flex items-center gap-2 rounded-md border-2 px-5 py-3 font-semibold"
          >
            <ShieldCheckIcon className="size-5" />
            Open the gate screen
          </Link>
        </div>
      ) : (
        <p className="text-muted font-mono text-xs tracking-widest uppercase">
          In development
        </p>
      )}
    </div>
  );
}
