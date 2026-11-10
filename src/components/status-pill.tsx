import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/16/solid";
import type { PassStatus } from "@/lib/gate/overview";

const LOOK: Record<
  PassStatus,
  { text: string; className: string; Icon: typeof CheckCircleIcon }
> = {
  admit: {
    text: "Valid now",
    className: "bg-admit text-shell",
    Icon: CheckCircleIcon,
  },
  not_yet_valid: {
    text: "Later today",
    className: "bg-wait text-ink",
    Icon: ClockIcon,
  },
  expired: {
    text: "Expired",
    className: "bg-refuse text-shell",
    Icon: XCircleIcon,
  },
  cancelled: {
    text: "Cancelled",
    className: "bg-refuse text-shell",
    Icon: XCircleIcon,
  },
  used_up: {
    text: "Used up",
    className: "bg-refuse text-shell",
    Icon: XCircleIcon,
  },
  invalid: {
    text: "Invalid",
    className: "bg-refuse text-shell",
    Icon: XCircleIcon,
  },
};

/** A pass's state as words on a colour, so it never relies on colour alone. */
export function StatusPill({ status }: { status: PassStatus }) {
  const { text, className, Icon } = LOOK[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 font-mono text-xs tracking-wider whitespace-nowrap uppercase ${className}`}
    >
      <Icon className="size-4" />
      {text}
    </span>
  );
}

export const statusText = (status: PassStatus) => LOOK[status].text;
