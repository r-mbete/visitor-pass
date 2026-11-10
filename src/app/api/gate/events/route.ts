import { getDb } from "@/db/client";
import { demoGateEnabled, demoGuard } from "@/lib/gate/demo";
import { parseUpload } from "@/lib/gate/events";
import { recordGateEvents } from "@/lib/gate/server";

/** Where a gate device uploads what happened. Safe to retry. Demo-only until guard sign-in exists. */
export async function POST(request: Request) {
  if (!demoGateEnabled()) return new Response(null, { status: 404 });
  const db = getDb();
  const guard = await demoGuard(db);
  if (!guard)
    return Response.json(
      { error: "No demo guard. Run `npm run db:seed`." },
      { status: 503 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  const upload = parseUpload(body);
  if (typeof upload === "string")
    return Response.json({ error: upload }, { status: 400 });

  const result = await recordGateEvents(db, guard, upload.events);
  return Response.json({ ...result, invalid: upload.errors });
}
