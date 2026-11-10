export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-8">
      <h1 className="max-w-2xl text-4xl leading-tight font-semibold sm:text-5xl">
        Visitor management for gated estates.
      </h1>
      <p className="text-muted max-w-prose text-lg">
        Residents pre-approve visitors with a signed pass. Guards check it at
        the gate, even with no signal, and every entry lands in a log that
        cannot be quietly changed.
      </p>
      <p className="text-muted font-mono text-xs tracking-widest uppercase">
        In development
      </p>
    </div>
  );
}
