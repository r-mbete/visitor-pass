export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-8">
      <p className="text-accent font-mono text-xs font-medium tracking-widest uppercase">
        404
      </p>
      <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">
        This page does not exist.
      </h1>
      <p className="text-muted max-w-prose text-lg">
        The link may be mistyped, or the page may have moved.
      </p>
    </div>
  );
}
