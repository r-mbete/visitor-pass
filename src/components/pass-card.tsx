import QRCode from "qrcode";
import { formatTime } from "@/lib/format";
import type { PassSummary } from "@/lib/gate/overview";
import { formatShortCode } from "@/lib/pass/short-code";
import { StatusPill } from "./status-pill";

/** One pass as a visitor would hold it: QR code and typed code, with its state. */
export async function PassCard({ summary }: { summary: PassSummary }) {
  const { pass, status, used, shortCode, token } = summary;
  const qr = await QRCode.toString(token, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return (
    <article className="border-line bg-shell flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{pass.visitorName}</h3>
          <p className="text-muted">Unit {pass.unitLabel}</p>
        </div>
        <StatusPill status={status} />
      </div>
      <div
        className="mx-auto w-full max-w-44 rounded bg-white p-1"
        role="img"
        aria-label={`QR code for ${pass.visitorName}'s pass`}
        // Generated on the server from our own signed token.
        dangerouslySetInnerHTML={{ __html: qr }}
      />
      <p className="text-center font-mono text-2xl tracking-widest">
        {formatShortCode(shortCode)}
      </p>
      <p className="text-muted text-sm">
        {formatTime(pass.validFrom * 1000)} to{" "}
        {formatTime(pass.validUntil * 1000)} · {used} of {pass.maxUses}{" "}
        {pass.maxUses === 1 ? "entry" : "entries"} used
      </p>
    </article>
  );
}
