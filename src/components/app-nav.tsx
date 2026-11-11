"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightIcon,
  ArrowRightStartOnRectangleIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TicketIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ClipboardDocumentListIcon as ClipboardDocumentListSolid,
  ShieldCheckIcon as ShieldCheckSolid,
  Squares2X2Icon as Squares2X2Solid,
  TicketIcon as TicketSolid,
  UserCircleIcon as UserCircleSolid,
} from "@heroicons/react/24/solid";
import { type AppPage, pageAllows, ROLE_NAMES } from "@/lib/access/pages";
import type { Role } from "@/lib/access/permissions";
import { signOut } from "@/lib/auth/actions";
import { Initials } from "./initials";

const NAV_ITEMS: {
  href: AppPage;
  label: string;
  Icon: typeof Squares2X2Icon;
  CurrentIcon: typeof Squares2X2Solid;
}[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    Icon: Squares2X2Icon,
    CurrentIcon: Squares2X2Solid,
  },
  {
    href: "/gate",
    label: "Gate",
    Icon: ShieldCheckIcon,
    CurrentIcon: ShieldCheckSolid,
  },
  {
    href: "/passes",
    label: "Passes",
    Icon: TicketIcon,
    CurrentIcon: TicketSolid,
  },
  {
    href: "/log",
    label: "Log",
    Icon: ClipboardDocumentListIcon,
    CurrentIcon: ClipboardDocumentListSolid,
  },
  {
    href: "/profile",
    label: "Profile",
    Icon: UserCircleIcon,
    CurrentIcon: UserCircleSolid,
  },
];

/** Who is signed in, as the menu shows them. */
export type NavUser = { name: string; role: Role; estateName: string };

const itemsFor = (role: Role) =>
  NAV_ITEMS.filter((item) => pageAllows(item.href, role));

function useCurrent() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** The app's name with its mark; `onDark` for the teal sidebar. */
export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link
      href="/"
      className={`font-display flex items-center gap-3 py-2 text-xl font-bold tracking-tight ${onDark ? "text-shell" : "text-ink"}`}
    >
      <span
        aria-hidden
        className={`grid size-9 place-items-center rounded-lg ${onDark ? "bg-glow text-brand-deep" : "bg-brand text-glow"}`}
      >
        <ShieldCheckSolid className="size-5" />
      </span>
      Salama Pass
    </Link>
  );
}

/** A teal sidebar on desktops, like a gatehouse wall the pages sit against. */
export function Sidebar({ user }: { user: NavUser }) {
  const isCurrent = useCurrent();
  return (
    <aside className="bg-brand text-brand-soft fixed inset-y-0 left-0 z-20 hidden w-64 flex-col gap-8 px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo onDark />
      </div>
      <nav aria-label="Main">
        <ul className="flex flex-col gap-1">
          {itemsFor(user.role).map(
            ({ href, label, Icon: Outline, CurrentIcon }) => {
              const current = isCurrent(href);
              const Icon = current ? CurrentIcon : Outline;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors ${
                      current
                        ? "bg-accent text-shell shadow-sm"
                        : "hover:text-shell hover:bg-white/10"
                    }`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </Link>
                </li>
              );
            },
          )}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        {user.role === "guard" && !isCurrent("/gate") && (
          <Link
            href="/gate"
            className="bg-brand-deep group flex flex-col gap-3 rounded-2xl p-4"
          >
            <span
              aria-hidden
              className="bg-glow text-brand-deep grid size-10 place-items-center rounded-xl"
            >
              <ShieldCheckSolid className="size-6" />
            </span>
            <span>
              <span className="text-shell block font-semibold">
                Visitor at the gate?
              </span>
              <span className="block text-sm">Check their pass code.</span>
            </span>
            <span className="bg-shell text-brand flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-transform group-hover:translate-x-0.5">
              Open gate screen
              <ArrowRightIcon className="size-4" />
            </span>
          </Link>
        )}

        <div className="border-t border-white/10 pt-4">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/10"
          >
            <Initials name={user.name} className="bg-glow text-brand-deep" />
            <span className="min-w-0">
              <span className="text-shell block truncate font-semibold">
                {user.name}
              </span>
              <span className="block truncate text-sm">
                {ROLE_NAMES[user.role]} · {user.estateName}
              </span>
            </span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="hover:text-shell mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
            >
              <ArrowRightStartOnRectangleIcon className="size-5" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** The menu inside the header, on tablets. */
export function TopNav({ user }: { user: NavUser }) {
  const isCurrent = useCurrent();
  return (
    <nav aria-label="Main" className="hidden sm:block lg:hidden">
      <ul className="flex gap-1">
        {itemsFor(user.role).map(
          ({ href, label, Icon: Outline, CurrentIcon }) => {
            const current = isCurrent(href);
            const Icon = current ? CurrentIcon : Outline;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
                    current ? "bg-brand text-shell" : "text-ink hover:bg-shell"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}

/** A tab bar at the bottom of a phone screen, where a thumb reaches. */
export function BottomNav({ user }: { user: NavUser }) {
  const isCurrent = useCurrent();
  const items = itemsFor(user.role);
  return (
    <nav
      aria-label="Main"
      className="border-line bg-shell fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map(({ href, label, Icon: Outline, CurrentIcon }) => {
          const current = isCurrent(href);
          const Icon = current ? CurrentIcon : Outline;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  current ? "text-brand" : "text-muted"
                }`}
              >
                {current && (
                  <span
                    aria-hidden
                    className="bg-accent absolute inset-x-6 top-0 h-1 rounded-b"
                  />
                )}
                <Icon className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
