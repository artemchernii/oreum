import { cn } from "@/lib/utils";

/**
 * The only component in the app allowed to emit green or red. Keeping the
 * whole colour budget in one file is what makes "nothing else uses green or
 * red" a checkable rule instead of a review convention.
 */
export function PriceChange({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const up = percent > 0;
  const flat = percent === 0;

  return (
    <span
      className={cn(
        "num tabular-nums",
        flat && "text-muted-foreground",
        !flat && (up ? "text-price-up" : "text-price-down"),
        className,
      )}
    >
      {/* Sign is always rendered so the minus cannot shift the column. */}
      {up ? "+" : flat ? "" : "−"}
      {Math.abs(percent).toFixed(2)}%
    </span>
  );
}

export function Price({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("num tabular-nums", className)}>
      {value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
