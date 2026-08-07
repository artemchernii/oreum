import type { Event, EventImpact } from "@/lib/types";
import { ImpactArrow } from "@/components/impact-arrow";

export type Driver = {
  impact: EventImpact;
  event: Event;
};

/**
 * "Why it's moving". Numbered to match the chart markers above, so the two
 * sections describe the same events rather than two parallel lists.
 *
 * Every line carries a source link. No link, no line.
 */
export function DriverList({ drivers }: { drivers: Driver[] }) {
  return (
    <section className="rounded-lg border">
      <h2 className="border-b px-4 py-2.5 text-sm font-medium">
        Why it&rsquo;s moving
      </h2>
      <ol className="divide-y">
        {drivers.map((driver, index) => (
          <li key={driver.impact.eventId} className="flex gap-3 px-4 py-3">
            <span className="num mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <ImpactArrow direction={driver.impact.direction} />
                <p className="min-w-0 text-sm">{driver.impact.reason}</p>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                {driver.event.headline}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                <a
                  href={driver.event.sources[0].url}
                  className="underline underline-offset-2"
                >
                  {driver.event.sources[0].outlet}
                </a>
                {driver.event.sources.length > 1 && (
                  <span> +{driver.event.sources.length - 1} source
                    {driver.event.sources.length > 2 ? "s" : ""}
                  </span>
                )}
                {driver.impact.viaEdge && (
                  <span> · via {driver.impact.viaEdge.kind}</span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
