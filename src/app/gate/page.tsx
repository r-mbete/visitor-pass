import type { Metadata } from "next";
import { SetupNotice } from "@/components/setup-notice";
import { requirePage } from "@/lib/auth/session";
import { loadGate } from "@/lib/gate/load";
import { GateScreen } from "./gate-screen";

export const metadata: Metadata = {
  title: "Gate",
  robots: { index: false, follow: false },
};

export default async function GatePage() {
  const me = await requirePage("/gate");
  const gate = await loadGate(me.estateId);
  if (!gate.ok) return <SetupNotice problem={gate.problem} />;
  // Keyed by build time: a refreshed bundle already counts this device's entries, so local counts start again.
  return (
    <GateScreen
      key={gate.bundle.builtAt}
      bundle={gate.bundle}
      guardName={me.name}
    />
  );
}
