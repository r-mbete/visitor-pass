import {
  ArrowLeftStartOnRectangleIcon,
  ArrowRightEndOnRectangleIcon,
  NoSymbolIcon,
} from "@heroicons/react/20/solid";
import { formatDayTime } from "@/lib/format";
import type { LogRow } from "@/lib/gate/server";

const REASON: Record<string, string> = {
  unreadable: "not a valid pass",
  unknown_key: "not issued here",
  bad_signature: "altered pass",
  wrong_estate: "another estate",
  not_yet_valid: "too early",
  expired: "expired",
  cancelled: "cancelled",
  used_up: "already used",
};

function what(row: LogRow) {
  if (row.kind === "entry") return "Entered";
  if (row.kind === "exit") return "Left";
  return `Refused: ${REASON[row.reason ?? ""] ?? row.reason}`;
}

function Mark({ row }: { row: LogRow }) {
  if (row.kind === "refusal")
    return <NoSymbolIcon className="text-refuse size-5 shrink-0" />;
  if (row.kind === "entry")
    return (
      <ArrowRightEndOnRectangleIcon className="text-admit size-5 shrink-0" />
    );
  return (
    <ArrowLeftStartOnRectangleIcon className="text-muted size-5 shrink-0" />
  );
}

/** The gate log: a table on wide screens, a stacked list on phones, or always a list where space is narrow. */
export function GateLog({
  rows,
  compact = false,
}: {
  rows: LogRow[];
  compact?: boolean;
}) {
  if (rows.length === 0)
    return <p className="text-muted">Nothing recorded yet.</p>;
  return (
    <>
      <ul
        className={`divide-line divide-y ${compact ? "-my-3" : "border-line bg-shell shadow-card rounded-2xl border md:hidden"}`}
      >
        {rows.map((row) => (
          <li
            key={row.id}
            className={`flex items-start gap-3 py-3 ${compact ? "" : "px-4"}`}
          >
            <span className="pt-0.5">
              <Mark row={row} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {row.visitorName ?? "Unknown visitor"}
                {row.unitLabel && (
                  <span className="text-muted font-normal">
                    {" "}
                    · {row.unitLabel}
                  </span>
                )}
              </p>
              <p className={row.kind === "refusal" ? "text-refuse" : ""}>
                {what(row)}
              </p>
              <p className="text-muted text-sm">
                {formatDayTime(row.deviceTime)} · {row.guardName}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div
        className={`border-line bg-shell shadow-card hidden overflow-hidden rounded-2xl border ${compact ? "" : "md:block"}`}
      >
        <table className="w-full text-left">
          <thead className="text-muted border-line bg-paper/60 border-b font-mono text-xs tracking-widest uppercase">
            <tr>
              <th className="px-4 py-3 font-normal">When</th>
              <th className="px-4 py-3 font-normal">What</th>
              <th className="px-4 py-3 font-normal">Visitor</th>
              <th className="px-4 py-3 font-normal">Unit</th>
              <th className="px-4 py-3 font-normal">Guard</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDayTime(row.deviceTime)}
                </td>
                <td
                  className={`px-4 py-3 ${row.kind === "refusal" ? "text-refuse" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <Mark row={row} />
                    {what(row)}
                  </span>
                </td>
                <td className="px-4 py-3">{row.visitorName ?? "—"}</td>
                <td className="px-4 py-3">{row.unitLabel ?? "—"}</td>
                <td className="px-4 py-3">{row.guardName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
