import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** A main action, shown beside the title on wide screens and below it on phones. */
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-prose">
        {eyebrow && (
          <p className="text-muted font-mono text-xs tracking-widest uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display mt-1 text-3xl leading-tight italic sm:text-4xl">
          {title}
        </h1>
        {description && <p className="text-muted mt-2">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
