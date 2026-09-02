"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  DEFAULT_RANGE,
  availableRanges,
  priceDomain,
  sliceRange,
  windowChange,
  type Direction,
  type HistoryBar,
  type Range,
} from "@/lib/price-history";
import { formatTradeDate } from "@/lib/format";

/**
 * The Ticker's price chart, drawn from finalized daily closes.
 *
 * A client component because it owns the timeframe state and Recharts is
 * client-side. It receives the full two-year window as a prop and slices it
 * here, so switching timeframe is instant and needs no round trip for data
 * the page already sent.
 *
 * Colour comes from the price-movement tokens, the only two hued tokens in
 * the system, and encodes *direction over the window* — observed movement,
 * never attention. A flat window is muted rather than green.
 */

const chartConfig = {
  close: { label: "Close" },
} satisfies ChartConfig;

/** The direction channel, straight from the token layer. */
const STROKE: Record<Direction, string> = {
  up: "var(--price-up)",
  down: "var(--price-down)",
  flat: "var(--muted-foreground)",
};

function formatPrice(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(2);
}

/** "28 Aug" up close, "Aug 25" once a year or more is on screen. */
function axisDateFormatter(range: Range) {
  const long = range === "1Y" || range === "2Y";
  return (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
      ...(long ? { year: "2-digit" } : { day: "numeric" }),
      month: "short",
      timeZone: "UTC",
    });
}

/** Roughly five evenly spaced dates, always including the newest. */
function axisTicks(bars: readonly HistoryBar[]): string[] {
  if (bars.length <= 5) return bars.map((bar) => bar.date);

  const step = Math.floor((bars.length - 1) / 4);
  const ticks: string[] = [];
  for (let i = bars.length - 1; i >= 0; i -= step) ticks.unshift(bars[i].date);
  return ticks;
}

export function PriceChart({
  symbol,
  bars,
}: {
  symbol: string;
  bars: HistoryBar[];
}) {
  const gradientId = useId();
  const ranges = useMemo(() => availableRanges(bars), [bars]);

  // The default is the longest offered window when six months is not among
  // them, so a thin cache shows what it has rather than an empty frame.
  const [range, setRange] = useState<Range>(
    ranges.includes(DEFAULT_RANGE) ? DEFAULT_RANGE : (ranges.at(-1) ?? "1M"),
  );

  const visible = useMemo(() => sliceRange(bars, range), [bars, range]);
  const change = useMemo(() => windowChange(visible), [visible]);
  const domain = useMemo(
    () => priceDomain(visible.map((bar) => bar.close)),
    [visible],
  );

  const direction: Direction = change?.direction ?? "flat";
  const stroke = STROKE[direction];

  return (
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium">Price</h2>
          {/*
            The window's move, not the day's — the header above already shows
            the daily change. One selective label beats a number on every
            point.
          */}
          {change && (
            <span
              className={cn(
                "num text-xs",
                direction === "up" && "text-price-up",
                direction === "down" && "text-price-down",
                direction === "flat" && "text-muted-foreground",
              )}
            >
              {change.percent > 0 ? "+" : ""}
              {change.percent.toFixed(2)}% over {range}
            </span>
          )}
        </div>

        {ranges.length > 1 && (
          <div
            className="flex items-center gap-0.5 rounded-md border p-0.5"
            role="group"
            aria-label="Timeframe"
          >
            {ranges.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setRange(name)}
                aria-pressed={name === range}
                className={cn(
                  "num cursor-pointer rounded px-2 py-0.5 text-xs transition-colors",
                  name === range
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length < 2 ? (
        /*
          An empty frame with axes would imply the data is missing rather than
          not yet fetched. Ingestion backfills on a schedule; saying so is more
          use than a blank grid.
        */
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          No cached price history for {symbol} yet. Ingestion fills it in on the
          next run.
        </p>
      ) : (
        <>
          <ChartContainer config={chartConfig} className="h-56 w-full px-2 py-3">
            <AreaChart data={visible} margin={{ left: 4, right: 8, top: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Recessive: horizontal only, so the line carries the reading. */}
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />

              {/*
                A category axis, not a time axis. Sessions are evenly spaced
                because that is what traded — a time scale would draw flat
                weekend and holiday gaps the market never had.
              */}
              <XAxis
                dataKey="date"
                ticks={axisTicks(visible)}
                tickFormatter={axisDateFormatter(range)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="num"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />

              <YAxis
                domain={domain}
                tickFormatter={formatPrice}
                tickLine={false}
                axisLine={false}
                width={44}
                tickCount={5}
                className="num"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />

              <ChartTooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      formatTradeDate(String(payload?.[0]?.payload?.date ?? ""))
                    }
                    formatter={(value) => (
                      <span className="num">
                        {formatPrice(Number(value))}
                      </span>
                    )}
                  />
                }
              />

              <Area
                dataKey="close"
                /*
                  Linear, never monotone. A smoothed curve invents prices
                  between two closes that never traded, which is exactly the
                  kind of plausible fiction this product must not draw.
                */
                type="linear"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                // Points only on hover: a dot per session is noise at 500 of them.
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
                /*
                  No entrance animation. Recharts reveals an area over 1.5s by
                  animating a clip, so the chart is empty at first paint — a
                  real "where is my data" moment. Motion also manufactures
                  attention, which is the one thing this product must not do
                  by decoration.
                */
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>

          {/*
            Identity is never colour-alone, and a chart is not readable by a
            screen reader. The same numbers, as text.
          */}
          <details className="border-t px-4 py-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {visible.length} sessions as a table
            </summary>
            <div className="mt-2 max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">
                  {symbol} daily closes over {range}
                </caption>
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 font-medium">
                      Date
                    </th>
                    <th scope="col" className="py-1 text-right font-medium">
                      Close
                    </th>
                  </tr>
                </thead>
                <tbody className="num">
                  {[...visible].reverse().map((bar) => (
                    <tr key={bar.date} className="border-t border-border/40">
                      <td className="py-1">{formatTradeDate(bar.date)}</td>
                      <td className="py-1 text-right">{bar.close.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
