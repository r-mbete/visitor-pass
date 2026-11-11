import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PassCard } from "@/components/pass-card";
import { SetupNotice } from "@/components/setup-notice";
import { requirePage } from "@/lib/auth/session";
import { loadGate } from "@/lib/gate/load";
import { passOverview } from "@/lib/gate/overview";

export const metadata: Metadata = {
  title: "Passes",
  robots: { index: false, follow: false },
};

export default async function PassesPage() {
  const me = await requirePage("/passes");
  const gate = await loadGate(me.estateId);
  if (!gate.ok) return <SetupNotice problem={gate.problem} />;
  const all = await passOverview(gate.bundle);
  // Residents see only their own unit's visitors (requirements §8).
  const passes =
    me.role === "resident"
      ? all.filter((p) => me.unitIds.includes(p.pass.unitId))
      : all;
  const resident = me.role === "resident";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={
          resident
            ? `${gate.bundle.estateName} · Unit ${me.unitLabels.join(", ")}`
            : gate.bundle.estateName
        }
        title={resident ? "Your visitors" : "Passes"}
        description={
          resident
            ? "Passes for your unit around today. Share the QR code or the typed code with your visitor."
            : "Visitors expected around today. Type a code on the gate screen to check it."
        }
      />
      {passes.length === 0 ? (
        <p className="text-muted">No passes around today.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {passes.map((summary) => (
            <li key={summary.shortCode}>
              <PassCard summary={summary} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
