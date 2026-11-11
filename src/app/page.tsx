import { ArrowRightEndOnRectangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/access/pages";
import { getSignedIn } from "@/lib/auth/session";

export default async function Home() {
  const me = await getSignedIn().catch(() => null);
  if (me) redirect(homeFor(me.role));
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-8">
      <h1 className="font-display max-w-2xl text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
        Visitor management for gated estates.
      </h1>
      <p className="text-muted max-w-prose text-lg">
        Residents pre-approve visitors with a signed pass. Guards check it at
        the gate, even with no signal, and every entry lands in a log that
        cannot be quietly changed.
      </p>
      <div>
        <Link
          href="/login"
          className="bg-brand text-shell hover:bg-brand-deep inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors"
        >
          <ArrowRightEndOnRectangleIcon className="size-5" />
          Sign in
        </Link>
      </div>
    </div>
  );
}
