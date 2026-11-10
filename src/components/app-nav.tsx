"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import {
  ClipboardDocumentListIcon as ClipboardDocumentListSolid,
  ShieldCheckIcon as ShieldCheckSolid,
  Squares2X2Icon as Squares2X2Solid,
  TicketIcon as TicketSolid,
} from "@heroicons/react/24/solid";

export const NAV_ITEMS = [
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
] as const;

function useCurrent() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** The menu inside the header, from tablet width up. */
export function TopNav() {
  const isCurrent = useCurrent();
  return (
    <nav aria-label="Main" className="hidden sm:block">
      <ul className="flex gap-1">
        {NAV_ITEMS.map(({ href, label, Icon: Outline, CurrentIcon }) => {
          const current = isCurrent(href);
          const Icon = current ? CurrentIcon : Outline;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors ${
                  current ? "bg-ink text-shell" : "hover:bg-shell text-ink"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A tab bar at the bottom of a phone screen, where a thumb reaches. */
export function BottomNav() {
  const isCurrent = useCurrent();
  return (
    <nav
      aria-label="Main"
      className="border-line bg-shell fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, Icon: Outline, CurrentIcon }) => {
          const current = isCurrent(href);
          const Icon = current ? CurrentIcon : Outline;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  current ? "text-ink" : "text-muted"
                }`}
              >
                {current && (
                  <span
                    aria-hidden
                    className="bg-ink absolute inset-x-6 top-0 h-1 rounded-b"
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
