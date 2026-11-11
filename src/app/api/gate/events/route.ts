import { signedInFor } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { parseUpload } from "@/lib/gate/events";
import { recordGateEvents } from "@/lib/gate/server";

/** Where a gate device uploads what happened. Safe to retry. Signed-in guards only; recordGateEvents checks the role. */
export async function POST(request: Request) {
  const me = await signedInFor(request);
  if (!me) return Response.json({ error: "sign in first" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  const upload = parseUpload(body);
  if (typeof upload === "string")
    return Response.json({ error: upload }, { status: 400 });

  const result = await recordGateEvents(getDb(), me, upload.events);
  return Response.json({ ...result, invalid: upload.errors });
}
