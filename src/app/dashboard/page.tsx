import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GateLog } from "@/components/gate-log";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { StatusPill } from "@/components/status-pill";
import { getDb } from "@/db/client";
import { endOfDay, formatDay, formatTime, startOfDay } from "@/lib/format";
import { demoGateEnabled } from "@/lib/gate/demo";
import { loadDemoGate } from "@/lib/gate/load";
import { passOverview, todaySummary } from "@/lib/gate/overview";
import { recentGateLog } from "@/lib/gate/server";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

function Stat({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: typeof CalendarDaysIcon;
}) {
  return (
    <div className="border-line bg-shell rounded-lg border p-4">
      <dt className="text-muted flex items-center gap-2 text-sm">
        <Icon className="size-5 shrink-0" />
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  link,
}: {
  id: string;
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {link && (
        <Link
          href={link.href}
          className="text-accent font-medium underline underline-offset-4"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  await connection();
  if (!demoGateEnabled()) notFound();
  const gate = await loadDemoGate();
  if (!gate.ok) return <SetupNotice problem={gate.problem} />;
  const { bundle } = gate;
  const db = getDb();
  const now = new Date();

  const [passes, today, recent] = await Promise.all([
    passOverview(bundle, now),
    todaySummary(db, bundle.estateId, startOfDay(now)),
    recentGateLog(db, bundle.estateId, 5),
  ]);
  const tonight = endOfDay(now).getTime() / 1000;
  const expected = passes.filter(
    (p) =>
      (p.status === "admit" || p.status === "not_yet_valid") &&
      p.pass.validFrom < tonight,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={formatDay(now)}
        title={bundle.estateName}
        description={`Good to see you, ${gate.guard.name}.`}
      />

      <Link
        href="/gate"
        className="bg-ink text-shell flex items-center justify-between gap-4 rounded-lg px-5 py-5 sm:px-6"
      >
        <span className="flex items-center gap-4">
          <ShieldCheckIcon className="size-8 shrink-0" />
          <span>
            <span className="block text-xl font-semibold">Check a visitor</span>
            <span className="block opacity-80">
              Type their pass code at the gate
            </span>
          </span>
        </span>
        <ArrowRightIcon className="size-6 shrink-0" />
      </Link>

      <section aria-labelledby="today">
        <h2 id="today" className="sr-only">
          Today in numbers
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            label="Expected today"
            value={expected.length}
            Icon={CalendarDaysIcon}
          />
          <Stat
            label="Inside now"
            value={today.inside.length}
            Icon={UserGroupIcon}
          />
          <Stat
            label="Entries today"
            value={today.entries}
            Icon={ArrowRightEndOnRectangleIcon}
          />
          <Stat
            label="Refusals today"
            value={today.refusals}
            Icon={NoSymbolIcon}
          />
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="expected">
          <SectionHeading
            id="expected"
            title="Expected today"
            link={{ href: "/passes", label: "All passes" }}
          />
          {expected.length === 0 ? (
            <p className="text-muted">No more visitors expected today.</p>
          ) : (
            <ul className="divide-line border-line bg-shell divide-y rounded-lg border">
              {expected.map(({ shortCode, pass, status }) => (
                <li
                  key={shortCode}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pass.visitorName}</p>
                    <p className="text-muted text-sm">
                      Unit {pass.unitLabel} ·{" "}
                      {formatTime(pass.validFrom * 1000)} to{" "}
                      {formatTime(pass.validUntil * 1000)}
                    </p>
                  </div>
                  <StatusPill status={status} />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            <SectionHeading id="inside" title="Inside now" />
            {today.inside.length === 0 ? (
              <p className="text-muted">Nobody is inside on a pass.</p>
            ) : (
              <ul className="divide-line border-line bg-shell divide-y rounded-lg border">
                {today.inside.map((v) => (
                  <li
                    key={v.passId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <p className="min-w-0 truncate font-medium">
                      {v.visitorName}
                      <span className="text-muted font-normal">
                        {" "}
                        · {v.unitLabel}
                      </span>
                    </p>
                    <p className="text-muted shrink-0 text-sm">
                      since {formatTime(v.since)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="recent">
          <SectionHeading
            id="recent"
            title="Recent activity"
            link={{ href: "/log", label: "Full log" }}
          />
          <GateLog rows={recent} compact />
        </section>
      </div>
    </div>
  );
}
