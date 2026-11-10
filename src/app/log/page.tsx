import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GateLog } from "@/components/gate-log";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { getDb } from "@/db/client";
import { demoGateEnabled } from "@/lib/gate/demo";
import { loadDemoGate } from "@/lib/gate/load";
import { recentGateLog } from "@/lib/gate/server";

export const metadata: Metadata = {
  title: "Gate log",
  robots: { index: false, follow: false },
};

export default async function LogPage() {
  await connection();
  if (!demoGateEnabled()) notFound();
  const gate = await loadDemoGate();
  if (!gate.ok) return <SetupNotice problem={gate.problem} />;
  const rows = await recentGateLog(getDb(), gate.bundle.estateId, 100);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={gate.bundle.estateName}
        title="Gate log"
        description="Every entry, exit and refusal, newest first."
      />
      <GateLog rows={rows} />
    </div>
  );
}
