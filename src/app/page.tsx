import { events, impacts, filteredOutCount } from "@/lib/mock";
import { EventCard } from "@/components/event-card";
import { FilteredNotice } from "@/components/filtered-notice";

export default function FeedPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4 md:p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Feed</h1>
        <p className="text-xs text-muted-foreground">
          <span className="num tabular-nums">{events.length}</span> events
          touching your watchlist
        </p>
      </div>

      <FilteredNotice count={filteredOutCount} />

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          impacts={impacts.filter((impact) => impact.eventId === event.id)}
        />
      ))}
    </div>
  );
}
