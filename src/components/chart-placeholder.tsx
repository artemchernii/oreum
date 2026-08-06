import { cn } from "@/lib/utils";

const timeframes = ["1D", "5D", "1M", "6M", "1Y", "5Y"] as const;

/**
 * Stands in for Lightweight Charts, which is M9. The segmented control is
 * rendered as static buttons rather than shadcn Tabs: Radix Tabs is a client
 * component, and a control with no behaviour does not justify shipping one.
 *
 * Markers are numbered to match DriverList, so "why it moved" and "where it
 * moved" reference the same items.
 */
export function ChartPlaceholder({ markers }: { markers: number }) {
  return (
    <section className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">Price</h2>
        <div
          className="flex items-center gap-0.5 rounded-md border p-0.5"
          role="group"
          aria-label="Timeframe"
        >
          {timeframes.map((timeframe, index) => (
            <span
              key={timeframe}
              className={cn(
                "num rounded px-2 py-0.5 text-xs",
                index === 2
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              {timeframe}
            </span>
          ))}
        </div>
      </div>

      <div className="flex h-56 items-center justify-center px-4">
        <svg
          viewBox="0 0 400 120"
          className="h-full w-full text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          aria-label="Price chart placeholder"
          role="img"
        >
          <path d="M0 96 L40 88 L80 92 L120 70 L160 78 L200 54 L240 62 L280 40 L320 48 L360 26 L400 32" />
        </svg>
      </div>

      <div className="flex items-center gap-4 border-t px-4 py-2">
        {Array.from({ length: markers }, (_, index) => (
          <span
            key={index}
            className="num flex size-5 items-center justify-center rounded-full border text-xs"
          >
            {index + 1}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">
          Event markers, matched to the drivers below
        </span>
      </div>
    </section>
  );
}
