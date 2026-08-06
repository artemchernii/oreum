import type { ImpactDirection } from "@/lib/types";
import { cn } from "@/lib/utils";

const glyph: Record<ImpactDirection, string> = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

const label: Record<ImpactDirection, string> = {
  up: "Tailwind",
  down: "Headwind",
  neutral: "No clear direction",
};

/**
 * Monochrome by rule. Impact direction is inferred from the edge type, not
 * from measured price movement — colouring it green or red would present a
 * derived signal with the same visual weight as an observed one, and a wrong
 * signal costs trust that does not come back.
 */
export function ImpactArrow({
  direction,
  className,
}: {
  direction: ImpactDirection;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "num shrink-0 leading-none text-foreground",
        direction === "neutral" && "text-muted-foreground",
        className,
      )}
      title={label[direction]}
    >
      <span aria-hidden="true">{glyph[direction]}</span>
      <span className="sr-only">{label[direction]}</span>
    </span>
  );
}
