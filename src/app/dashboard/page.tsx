import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { GateLog } from "@/components/gate-log";
import { HourlyChart } from "@/components/hourly-chart";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { StatusPill } from "@/components/status-pill";
import { getDb } from "@/db/client";
import { endOfDay, formatDay, formatTime, startOfDay } from "@/lib/format";
import { can } from "@/lib/access/permissions";
import { requirePage } from "@/lib/auth/session";
import { loadGate } from "@/lib/gate/load";
import { passOverview, todaySummary } from "@/lib/gate/overview";
import { recentGateLog } from "@/lib/gate/server";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const TILES = {
  mint: "bg-tile-mint",
  sky: "bg-tile-sky",
  sand: "bg-tile-sand",
  peach: "bg-tile-peach",
} as const;

function Stat({
  label,
  value,
  note,
  tone,
  Icon,
}: {
  label: string;
  value: number;
  note: string;
  tone: keyof typeof TILES;
  Icon: typeof CalendarDaysIcon;
}) {
  return (
    <div className={`${TILES[tone]} flex flex-col gap-3 rounded-2xl p-4`}>
      <span
        aria-hidden
        className="bg-shell text-brand grid size-10 place-items-center rounded-full shadow-sm"
      >
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col">
        <dt className="font-semibold">{label}</dt>
        <dd className="font-display order-first text-3xl font-bold tabular-nums">
          {value}
        </dd>
        <dd className="text-muted text-sm">{note}</dd>
      </div>
    </div>
  );
}

function Card({
  id,
  title,
  subtitle,
  link,
  className = "",
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`bg-shell border-line shadow-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={id} className="font-display text-lg font-bold">
            {title}
          </h2>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
        {link && (
          <Link
            href={link.href}
            className="text-accent flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline hover:underline-offset-4"
          >
            {link.label}
            <ArrowRightIcon className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const AVATARS = [TILES.mint, TILES.sky, TILES.sand, TILES.peach];

function Avatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      aria-hidden
      className={`${AVATARS[index % AVATARS.length]} text-brand grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold`}
    >
      {initials}
    </span>
  );
}

export default async function DashboardPage() {
  const me = await requirePage("/dashboard");
  // Guards see what the gate needs today; the log itself is for admins (requirements §7).
  const showLog = can(me, { do: "log.read", estateId: me.estateId });
  const gate = await loadGate(me.estateId);
  if (!gate.ok) return <SetupNotice problem={gate.problem} />;
  const { bundle } = gate;
  const db = getDb();
  const now = new Date();

  const [passes, today, recent] = await Promise.all([
    passOverview(bundle, now),
    todaySummary(db, bundle.estateId, startOfDay(now)),
    showLog ? recentGateLog(db, bundle.estateId, 5) : [],
  ]);
  const tonight = endOfDay(now).getTime() / 1000;
  const expected = passes.filter(
    (p) =>
      (p.status === "admit" || p.status === "not_yet_valid") &&
      p.pass.validFrom < tonight,
  );
  const validNow = expected.filter((p) => p.status === "admit").length;
  const currentHour = Math.floor(
    (now.getTime() - startOfDay(now).getTime()) / (60 * 60 * 1000),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={formatDay(now)}
        title={bundle.estateName}
        description={`Good to see you, ${me.name.split(" ")[0]}. Here is the gate today.`}
        action={
          me.role === "guard" && (
            <Link
              href="/gate"
              className="bg-brand text-shell hover:bg-brand-deep flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors"
            >
              <ShieldCheckIcon className="size-5" />
              Check a visitor
            </Link>
          )
        }
      />

      <Card
        id="today"
        title="Today at the gate"
        subtitle={`Since midnight, as of ${formatTime(now)}`}
      >
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            tone="mint"
            label="Expected today"
            value={expected.length}
            note={`${validNow} can come in now`}
            Icon={CalendarDaysIcon}
          />
          <Stat
            tone="sky"
            label="Inside now"
            value={today.inside.length}
            note="Came in, not yet left"
            Icon={UserGroupIcon}
          />
          <Stat
            tone="sand"
            label="Entries"
            value={today.entries}
            note="Admitted on a pass"
            Icon={ArrowRightEndOnRectangleIcon}
          />
          <Stat
            tone="peach"
            label="Refusals"
            value={today.refusals}
            note="Turned away with a reason"
            Icon={NoSymbolIcon}
          />
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          id="hours"
          title="Gate activity by hour"
          subtitle="Entries and refusals today, Nairobi time"
          className="lg:col-span-2"
        >
          <HourlyChart byHour={today.byHour} currentHour={currentHour} />
        </Card>

        <Card id="inside" title="Inside now" subtitle="Visitors on the estate">
          {today.inside.length === 0 ? (
            <p className="text-muted">Nobody is inside on a pass.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {today.inside.map((v, i) => (
                <li key={v.passId} className="flex items-center gap-3">
                  <Avatar name={v.visitorName} index={i + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{v.visitorName}</p>
                    <p className="text-muted text-sm">Unit {v.unitLabel}</p>
                  </div>
                  <p className="text-muted shrink-0 font-mono text-sm">
                    since {formatTime(v.since)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className={`grid gap-6 ${showLog ? "lg:grid-cols-2" : ""}`}>
        <Card
          id="expected"
          title="Expected today"
          subtitle="Passes that start before midnight"
          link={{ href: "/passes", label: "All passes" }}
        >
          {expected.length === 0 ? (
            <p className="text-muted">No more visitors expected today.</p>
          ) : (
            <ul className="divide-line -my-3 divide-y">
              {expected.map(({ shortCode, pass, status }, i) => (
                <li key={shortCode} className="flex items-center gap-3 py-3">
                  <Avatar name={pass.visitorName} index={i} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{pass.visitorName}</p>
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
        </Card>

        {showLog && (
          <Card
            id="recent"
            title="Recent activity"
            subtitle="The last five things at the gate"
            link={{ href: "/log", label: "Full log" }}
          >
            <GateLog rows={recent} compact />
          </Card>
        )}
      </div>
    </div>
  );
}
