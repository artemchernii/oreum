/**
 * Static shape only. The real price series arrives in M3 — this exists now so
 * the watchlist row layout is settled and does not get redesigned around it
 * later. Monochrome: the row's percentage already carries the direction, and
 * a second coloured signal would be redundant.
 */
export function Sparkline({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  const width = 56;
  const height = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}
