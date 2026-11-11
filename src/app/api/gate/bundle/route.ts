import { can } from "@/lib/access/permissions";
import { signedInFor } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { getSigningKey } from "@/lib/gate/key";
import { buildGateBundle } from "@/lib/gate/server";

/** What a gate device downloads to check passes offline. Signed-in guards only. */
export async function GET(request: Request) {
  const me = await signedInFor(request);
  if (!me) return Response.json({ error: "sign in first" }, { status: 401 });
  if (!can(me, { do: "gate.verify", estateId: me.estateId }))
    return Response.json({ error: "guards only" }, { status: 403 });
  const bundle = await buildGateBundle(
    getDb(),
    me.estateId,
    await getSigningKey(),
  );
  return Response.json(bundle, { headers: { "Cache-Control": "no-store" } });
}
