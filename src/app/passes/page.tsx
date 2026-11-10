import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { PassCard } from "@/components/pass-card";
import { SetupNotice } from "@/components/setup-notice";
import { demoGateEnabled } from "@/lib/gate/demo";
import { loadDemoGate } from "@/lib/gate/load";
import { passOverview } from "@/lib/gate/overview";

export const metadata: Metadata = {
  title: "Passes",
  robots: { index: false, follow: false },
};

export default async function PassesPage() {
  await connection();
  if (!demoGateEnabled()) notFound();
  const gate = await loadDemoGate();
  if (!gate.ok) return <SetupNotice problem={gate.problem} />;
  const passes = await passOverview(gate.bundle);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={gate.bundle.estateName}
        title="Passes"
        description="Visitors expected around today. Type a code on the gate screen to check it."
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
