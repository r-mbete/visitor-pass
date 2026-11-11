"use client";

import { useState } from "react";
import type { HourCount } from "@/lib/gate/overview";

const pad = (h: number) => String(h).padStart(2, "0");
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// Red and green sit close for deuteranopes, so refusals also carry a hatch.
const HATCH =
  "repeating-linear-gradient(135deg, var(--color-refuse) 0 3px, #d0574d 3px 6px)";

/** Whole-number gridlines, at most four above zero. */
function ticks(max: number): number[] {
  const top = Math.max(2, max);
  const step = Math.max(1, Math.ceil(top / 4));
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  if (out.at(-1)! < top) out.push(out.at(-1)! + step);
  return out;
}

/** Entries and refusals by hour of today, stacked, with the current hour marked. */
export function HourlyChart({
  byHour,
  currentHour,
}: {
  byHour: HourCount[];
  currentHour: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const grid = ticks(Math.max(...byHour.map((h) => h.entries + h.refusals)));
  const top = grid.at(-1)!;
  const shown = hovered === null ? null : byHour[hovered]!;

  return (
    <figure className="flex flex-col gap-4">
      <ul className="text-muted flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden className="bg-admit size-3 rounded-sm" />
          Entries
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-sm"
            style={{ background: HATCH }}
          />
          Refusals
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="bg-tile-peach border-glow size-3 rounded-sm border"
          />
          This hour
        </li>
      </ul>

      <div aria-hidden className="flex gap-2">
        <div className="text-muted relative w-5 shrink-0 font-mono text-xs tabular-nums">
          {grid.map((v) => (
            <span
              key={v}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(v / top) * 100}%` }}
            >
              {v}
            </span>
          ))}
        </div>

        <div className="relative h-44 flex-1">
          {grid.map((v) => (
            <div
              key={v}
              className={`absolute inset-x-0 border-t ${v === 0 ? "border-muted/40" : "border-line border-dashed"}`}
              style={{ bottom: `${(v / top) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex">
            {byHour.map((h, hour) => {
              const now = hour === currentHour;
              const future = hour > currentHour;
              return (
                <div
                  key={hour}
                  onPointerEnter={() => setHovered(hour)}
                  onPointerLeave={() => setHovered(null)}
                  className={`relative flex flex-1 flex-col justify-end px-[2px] sm:px-[3px] ${
                    hovered === hour ? "bg-brand/5" : ""
                  } ${now ? "bg-tile-peach/60" : ""}`}
                >
                  {h.refusals > 0 && (
                    <div
                      className={`rounded-t-[4px] ${h.entries > 0 ? "mb-[2px]" : ""}`}
                      style={{
                        height: `${(h.refusals / top) * 100}%`,
                        background: HATCH,
                      }}
                    />
                  )}
                  {h.entries > 0 && (
                    <div
                      className={`bg-admit ${h.refusals > 0 ? "" : "rounded-t-[4px]"}`}
                      style={{ height: `${(h.entries / top) * 100}%` }}
                    />
                  )}
                  {future && h.entries + h.refusals === 0 && (
                    <div className="bg-line/60 mx-auto h-1 w-1 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {shown && hovered !== null && (
            <div
              className="bg-ink text-shell pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded-lg px-3 py-2 text-sm whitespace-nowrap shadow-lg"
              style={{
                left: `clamp(4.5rem, ${((hovered + 0.5) / 24) * 100}%, calc(100% - 4.5rem))`,
              }}
            >
              <p className="font-mono text-xs opacity-80">
                {pad(hovered)}:00 to {pad((hovered + 1) % 24)}:00
              </p>
              <p>
                {plural(shown.entries, "entry", "entries")} ·{" "}
                {plural(shown.refusals, "refusal", "refusals")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div aria-hidden className="text-muted ml-7 flex font-mono text-xs">
        {byHour.map((_, hour) => (
          <span
            key={hour}
            className={`flex-1 text-center ${hour === currentHour ? "text-accent font-medium" : ""}`}
          >
            {hour % 6 === 0 ? (
              pad(hour)
            ) : hour % 3 === 0 ? (
              <span className="hidden sm:inline">{pad(hour)}</span>
            ) : null}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Entries and refusals by hour today</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Entries</th>
            <th scope="col">Refusals</th>
          </tr>
        </thead>
        <tbody>
          {byHour.map((h, hour) =>
            h.entries + h.refusals === 0 ? null : (
              <tr key={hour}>
                <th scope="row">{pad(hour)}:00</th>
                <td>{h.entries}</td>
                <td>{h.refusals}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </figure>
  );
}
