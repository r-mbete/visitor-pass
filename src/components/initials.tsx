/** A round badge with someone's initials, standing in for a photo. */
export function Initials({
  name,
  className = "bg-tile-mint text-brand",
  size = "size-10 text-sm",
}: {
  name: string;
  className?: string;
  size?: string;
}) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold ${size} ${className}`}
    >
      {letters}
    </span>
  );
}
