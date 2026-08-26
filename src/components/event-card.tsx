import type { Event, EventImpact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImpactArrow } from "@/components/impact-arrow";

const kindLabel: Record<Event["kind"], string> = {
  direct: "Direct",
  second_order: "Second order",
  macro: "Macro",
};

/**
 * Second order reads strongest because it is the product's actual value —
 * direct news about a held company gets seen anyway. Macro is muted: it hits
 * everything and differentiates nothing.
 *
 * Emphasis is a uniform border, not a thick left stripe. A 4px border follows
 * the corner radius, so it renders as a pinched wedge rather than a rule, and
 * meeting a 1px translucent edge at a mitred corner has no clean solution.
 * The design bundle carries kind on a chip instead; that arrives with the
 * restyle.
 */
const kindStyles: Record<Event["kind"], string> = {
  direct: "border-border",
  second_order: "border-foreground/40",
  macro: "border-dashed border-border bg-muted/30",
};

export function EventCard({
  event,
  impacts,
}: {
  event: Event;
  impacts: EventImpact[];
}) {
  return (
    <article className={cn("rounded-lg border p-4", kindStyles[event.kind])}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">
          {kindLabel[event.kind]}
        </span>
        <span aria-hidden="true">·</span>
        <time dateTime={event.publishedAt} className="num tabular-nums">
          {formatTimestamp(event.publishedAt)}
        </time>
        <span aria-hidden="true">·</span>
        <SourceList event={event} />
      </div>

      {/*
        No truncation and no nowrap: real headlines run past fifteen words and
        the layout has to absorb that rather than hide it.
      */}
      <h3 className="mt-2 text-balance text-sm font-medium leading-snug">
        {event.headline}
      </h3>

      <p className="mt-1.5 text-sm text-muted-foreground">{event.summary}</p>

      {impacts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 border-t pt-3">
          {impacts.map((impact) => (
            <li
              key={`${impact.eventId}-${impact.symbol}`}
              className="flex gap-2 text-sm"
            >
              <ImpactArrow direction={impact.direction} />
              <span className="num shrink-0 font-medium">{impact.symbol}</span>
              <span className="min-w-0 text-muted-foreground">
                {impact.reason}
                {impact.viaEdge && (
                  <span className="text-foreground/70">
                    {" "}
                    (via {impact.viaEdge.kind})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/**
 * Deduplication merges one story across outlets, so "Reuters +2 sources" is
 * the normal case rather than an edge case.
 */
function SourceList({ event }: { event: Event }) {
  const [first, ...rest] = event.sources;

  return (
    <span className="min-w-0 truncate">
      <a href={first.url} className="underline underline-offset-2">
        {first.outlet}
      </a>
      {rest.length > 0 && (
        <span>
          {" "}
          +{rest.length} source{rest.length > 1 ? "s" : ""}
        </span>
      )}
    </span>
  );
}

/**
 * Fixed locale and UTC on purpose: market data is stored in UTC, and letting
 * the server's locale decide would make the rendered string differ between
 * the prerender and the client.
 */
const timestampFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function formatTimestamp(iso: string): string {
  return `${timestampFormat.format(new Date(iso))} UTC`;
}
