import { getWatchlist, getUniverse } from "@/lib/watchlist";
import { WatchlistRow } from "@/components/watchlist-row";
import { AddTicker } from "@/components/add-ticker";

export async function WatchlistSidebar() {
  const [watchlist, universe] = await Promise.all([
    getWatchlist(),
    getUniverse(),
  ]);

  const watched = new Set(watchlist.map((c) => c.symbol));
  const available = universe.filter((c) => !watched.has(c.symbol));

  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <div className="sticky top-14 flex flex-col gap-2 p-3">
        <h2 className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Watchlist
        </h2>

        {watchlist.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">
            Nothing here yet. Add a company to start filtering.
          </p>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {watchlist.map((company) => (
              <WatchlistRow key={company.symbol} company={company} />
            ))}
          </nav>
        )}

        <AddTicker available={available} />
      </div>
    </aside>
  );
}
