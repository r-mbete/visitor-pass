import { getDb } from "@/db/client";
import { demoGateEnabled, demoGuard } from "@/lib/gate/demo";
import { getSigningKey } from "@/lib/gate/key";
import { buildGateBundle } from "@/lib/gate/server";

/** What a gate device downloads to check passes offline. Demo-only until guard sign-in exists. */
export async function GET() {
  if (!demoGateEnabled()) return new Response(null, { status: 404 });
  const db = getDb();
  const guard = await demoGuard(db);
  if (!guard)
    return Response.json(
      { error: "No demo guard. Run `npm run db:seed`." },
      { status: 503 },
    );
  const bundle = await buildGateBundle(
    db,
    guard.estateId,
    await getSigningKey(),
  );
  return Response.json(bundle, { headers: { "Cache-Control": "no-store" } });
}
