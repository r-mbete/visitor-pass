import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Initials } from "@/components/initials";
import { SetupNotice } from "@/components/setup-notice";
import { PEOPLE } from "@/db/demo-estate";
import { homeFor, ROLE_NAMES } from "@/lib/access/pages";
import { getSignedIn } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** Only a path on this site, so a crafted link cannot send someone elsewhere after signing in. */
const safeNext = (next: unknown) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : null;

const DEMO_ACCOUNTS = Object.values(PEOPLE).filter(
  (p) => !("active" in p) || p.active,
);

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!process.env.DATABASE_URL)
    return <SetupNotice problem="The database is not configured." />;
  const params = await searchParams;
  const next = safeNext(params.next);
  const me = await getSignedIn();
  if (me) redirect(next ?? homeFor(me.role));
  const showDemo = process.env.NODE_ENV !== "production";
  const email = typeof params.email === "string" ? params.email : "";
  const pick = (address: string) =>
    `/login?${new URLSearchParams({ email: address, ...(next ? { next } : {}) })}`;

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-2">
      <section className="bg-shell border-line shadow-card rounded-3xl border p-6 sm:p-8">
        <p className="text-accent font-mono text-xs font-medium tracking-widest uppercase">
          Salama Pass
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
          Sign in
        </h1>
        {params.signedOut && (
          <p
            role="status"
            className="bg-tile-mint text-admit mt-4 rounded-xl px-4 py-3 font-medium"
          >
            You have signed out.
          </p>
        )}
        <LoginForm key={email} next={next} initialEmail={email} />
      </section>

      {showDemo && (
        <section
          aria-labelledby="demo-accounts"
          className="flex flex-col gap-4"
        >
          <div>
            <h2 id="demo-accounts" className="font-display text-xl font-bold">
              Demo accounts
            </h2>
            <p className="text-muted">
              Mvule Gardens people you can sign in as. There is no email service
              yet, so the code appears in the terminal running{" "}
              <code className="font-mono">npm run dev</code>. Pick one to fill
              in the email.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((p) => (
              <li key={p.id}>
                <Link
                  href={pick(p.email)}
                  scroll={false}
                  className={`bg-shell hover:border-brand flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${email === p.email ? "border-brand ring-brand ring-1" : "border-line"}`}
                >
                  <Initials name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-muted truncate font-mono text-sm">
                      {p.email}
                    </p>
                  </div>
                  <span className="text-muted shrink-0 text-sm">
                    {ROLE_NAMES[p.role]}
                    {"unit" in p ? ` · ${p.unit}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
