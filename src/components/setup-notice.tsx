import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

/** Shown instead of a demo page when the local setup is not finished. */
export function SetupNotice({ problem }: { problem: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-8">
      <p className="flex items-center gap-2 font-mono text-xs tracking-widest uppercase">
        <WrenchScrewdriverIcon className="size-5" />
        Setup needed
      </p>
      <h1 className="font-display text-3xl leading-tight italic">{problem}</h1>
      <ol className="text-muted list-decimal space-y-2 pl-6 text-lg">
        <li>
          Set <code className="font-mono">DATABASE_URL</code> in{" "}
          <code className="font-mono">.env.local</code> to an empty Postgres
          database.
        </li>
        <li>
          Run <code className="font-mono">npm run keys:generate</code> and add
          the line it prints to <code className="font-mono">.env.local</code>.
        </li>
        <li>
          Run <code className="font-mono">npm run db:migrate</code> and{" "}
          <code className="font-mono">npm run db:seed</code>.
        </li>
        <li>Restart the dev server.</li>
      </ol>
    </div>
  );
}
