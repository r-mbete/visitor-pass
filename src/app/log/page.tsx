import type { Metadata } from "next";
import { GateLog } from "@/components/gate-log";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/db/client";
import { requirePage } from "@/lib/auth/session";
import { recentGateLog } from "@/lib/gate/server";

export const metadata: Metadata = {
  title: "Gate log",
  robots: { index: false, follow: false },
};

export default async function LogPage() {
  const me = await requirePage("/log");
  const resident = me.role === "resident";
  const rows = await recentGateLog(getDb(), me.estateId, 100, {
    unitIds: resident ? me.unitIds : undefined,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow={
          resident
            ? `${me.estateName} · Unit ${me.unitLabels.join(", ")}`
            : me.estateName
        }
        title="Gate log"
        description={
          resident
            ? "Every entry, exit and refusal for your unit, newest first."
            : "Every entry, exit and refusal, newest first."
        }
      />
      <GateLog rows={rows} />
    </div>
  );
}
