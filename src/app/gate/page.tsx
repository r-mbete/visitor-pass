import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SetupNotice } from "@/components/setup-notice";
import { demoGateEnabled } from "@/lib/gate/demo";
import { loadDemoGate } from "@/lib/gate/load";
import { GateScreen } from "./gate-screen";

export const metadata: Metadata = {
  title: "Gate",
  robots: { index: false, follow: false },
};

export default async function GatePage() {
  await connection();
  if (!demoGateEnabled()) notFound();
  const gate = await loadDemoGate();
  if (!gate.ok) return <SetupNotice problem={gate.problem} />;
  // Keyed by build time: a refreshed bundle already counts this device's entries, so local counts start again.
  return (
    <GateScreen
      key={gate.bundle.builtAt}
      bundle={gate.bundle}
      guardName={gate.guard.name}
    />
  );
}
