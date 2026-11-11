import {
  ArrowRightStartOnRectangleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Initials } from "@/components/initials";
import { PageHeader } from "@/components/page-header";
import { formatDayTime } from "@/lib/format";
import { ROLE_NAMES } from "@/lib/access/pages";
import { signOut, signOutEverywhere } from "@/lib/auth/actions";
import { getAuth } from "@/lib/auth/auth";
import { requirePage } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

function Card({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="bg-shell border-line shadow-card flex flex-col gap-5 rounded-2xl border p-5 sm:p-6"
    >
      <div>
        <h2 id={id} className="font-display text-lg font-bold">
          {title}
        </h2>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/** "Chrome on Android" from a user agent, roughly; good enough to tell your own devices apart. */
function deviceName(userAgent: string | null | undefined) {
  if (!userAgent) return { label: "Unknown device", phone: false };
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "A browser";
  const system = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown system";
  return {
    label: `${browser} on ${system}`,
    phone: /Android|iPhone|Mobile/.test(ua),
  };
}

export default async function ProfilePage() {
  const me = await requirePage("/profile");
  const requestHeaders = await headers();
  const auth = getAuth();
  const [current, sessions] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }),
    auth.api.listSessions({ headers: requestHeaders }),
  ]);
  const devices = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader eyebrow={me.estateName} title="Your profile" />

      <section
        aria-label="Who you are"
        className="bg-brand text-brand-soft relative flex flex-col gap-5 overflow-hidden rounded-2xl p-6 sm:flex-row sm:items-center"
      >
        <span
          aria-hidden
          className="bg-glow/15 absolute -top-16 -right-10 size-56 rounded-full"
        />
        <Initials
          name={me.name}
          className="bg-glow text-brand-deep"
          size="size-20 text-2xl"
        />
        <div className="relative min-w-0">
          <p className="text-shell font-display truncate text-2xl font-bold">
            {me.name}
          </p>
          <p className="truncate">{me.email}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm font-medium">
            <li className="bg-shell/10 text-shell rounded-full px-3 py-1">
              {ROLE_NAMES[me.role]}
            </li>
            {me.unitLabels.map((label) => (
              <li
                key={label}
                className="bg-shell/10 text-shell rounded-full px-3 py-1"
              >
                Unit {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card
            id="details"
            title="Your details"
            subtitle="Your email, role and unit are set by your estate admin."
          >
            <ProfileForm name={me.name} phone={me.phone} />
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card
            id="devices"
            title="Where you are signed in"
            subtitle="Sessions last a week from when they were last used."
          >
            <ul className="divide-line -my-3 divide-y">
              {devices.map((s) => {
                const device = deviceName(s.userAgent);
                const Icon = device.phone
                  ? DevicePhoneMobileIcon
                  : ComputerDesktopIcon;
                const here = s.id === current?.session.id;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <span className="bg-tile-sky text-brand grid size-10 shrink-0 place-items-center rounded-full">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{device.label}</p>
                      <p className="text-muted text-sm">
                        {here
                          ? "This device"
                          : `Last used ${formatDayTime(new Date(s.updatedAt))}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card id="sign-out" title="Sign out">
            <div className="flex flex-col gap-3">
              <form action={signOut}>
                <button
                  type="submit"
                  className="border-brand text-brand hover:bg-paper flex w-full items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 font-semibold transition-colors"
                >
                  <ArrowRightStartOnRectangleIcon className="size-5" />
                  Sign out of this device
                </button>
              </form>
              <form action={signOutEverywhere}>
                <button
                  type="submit"
                  className="text-refuse w-full rounded-xl px-5 py-2 text-sm font-semibold hover:underline"
                >
                  Sign out everywhere
                  {devices.length > 1 ? ` (${devices.length} devices)` : ""}
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
