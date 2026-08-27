import { events, impacts, filteredOutCount } from "@/lib/mock";
import { getWatchlist } from "@/lib/watchlist";
import { EventCard } from "@/components/event-card";
import { FilteredNotice } from "@/components/filtered-notice";

export default async function FeedPage() {
  const watchlist = await getWatchlist();
  const watched = new Set(watchlist.map((c) => c.symbol));

  // The product in one line: an event is shown only if its impact chain
  // touches something the user holds. Events and impacts are still mock —
  // ingestion is M4, ranking is M6 — but the filter is the real shape.
  const visible = events.filter((event) =>
    impacts.some(
      (impact) => impact.eventId === event.id && watched.has(impact.symbol),
    ),
  );

  if (watchlist.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-lg font-medium">Nothing to show yet</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Oreum only shows news that touches your watchlist. Add a company from
          the sidebar to start filtering.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4 md:p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Feed</h1>
        <p className="text-xs text-muted-foreground">
          <span className="num tabular-nums">{visible.length}</span> events
          touching your watchlist
        </p>
      </div>

      <FilteredNotice count={filteredOutCount + (events.length - visible.length)} />

      {visible.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Nothing has touched these tickers yet.
        </p>
      ) : (
        visible.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            impacts={impacts.filter(
              (impact) =>
                impact.eventId === event.id && watched.has(impact.symbol),
            )}
          />
        ))
      )}
    </div>
  );
}
