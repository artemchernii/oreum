import type { Exposure } from "@/lib/types";

/**
 * Kept separate from metrics on purpose: metrics compare across companies,
 * exposures do not. "China revenue 21%" means something different for TSM
 * than for META, so putting them in one grid would invite a false comparison.
 */
export function ExposuresCard({ exposures }: { exposures: Exposure[] }) {
  return (
    <section className="rounded-lg border">
      <h2 className="border-b px-4 py-2.5 text-sm font-medium">Exposures</h2>
      <ul className="divide-y">
        {exposures.map((exposure) => (
          <li key={exposure.label} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-medium">{exposure.label}</span>
              <span className="num text-sm tabular-nums">{exposure.value}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {exposure.note}
            </p>
            {/*
              A stale exposure makes the impact engine confidently wrong,
              which is worse than having no exposure at all. The review date
              is shown, not just stored.
            */}
            <p className="mt-1.5 text-xs text-muted-foreground">
              {exposure.sourceNote} · reviewed{" "}
              <time dateTime={exposure.reviewedAt} className="num tabular-nums">
                {exposure.reviewedAt}
              </time>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
