import type { Metric } from "@/lib/types";

/**
 * Metrics are comparable across companies, which is why they are a separate
 * component from exposures. Every figure carries an anchor: a P/E of 38 says
 * nothing without knowing the company traded at 31 on average.
 */
export function MetricsRow({ metrics }: { metrics: Metric[] }) {
  return (
    <section>
      <h2 className="pb-2 text-sm font-medium">Metrics</h2>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}

export function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="bg-background p-3">
      <div className="truncate text-xs text-muted-foreground">
        {metric.label}
      </div>
      <div className="num mt-1 text-lg tabular-nums">{metric.value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {metric.anchorLabel}{" "}
        <span className="num tabular-nums">{metric.anchorValue}</span>
      </div>
    </div>
  );
}
