import { getWatchlist, getUniverse } from "@/lib/watchlist";
import { getQuotes } from "@/lib/quotes";
import { formatTradeDate } from "@/lib/format";
import { WatchlistRow } from "@/components/watchlist-row";
import { AddTicker } from "@/components/add-ticker";

export async function WatchlistSidebar() {
  const watchlist = await getWatchlist();

  // Quotes are fetched here, once, rather than inside each row: a row-level
  // lookup would be one query per ticker, which is the shape that eats a free
  // tier and the reason the cache exists at all.
  const [universe, quotes] = await Promise.all([
    getUniverse(),
    getQuotes(watchlist.map((company) => company.symbol)),
  ]);

  const watched = new Set(watchlist.map((c) => c.symbol));
  const available = universe.filter((c) => !watched.has(c.symbol));

  // Ingestion writes every symbol for a date in one pass, so in practice these
  // agree. Labelling only when they do keeps the header from claiming a date
  // that some row does not actually have.
  const dates = new Set([...quotes.values()].map((quote) => quote.asOf));
  const sharedDate = dates.size === 1 ? [...dates][0] : null;

  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <div className="sticky top-14 flex flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between px-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Watchlist
          </h2>
          {sharedDate && (
            // The prices are closes, never live. Saying so is the same
            // honesty as the em dash: show the gap rather than imply it away.
            <span className="num text-[10px] text-muted-foreground">
              {formatTradeDate(sharedDate)}
            </span>
          )}
        </div>

        {watchlist.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">
            Nothing here yet. Add a company to start filtering.
          </p>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {watchlist.map((company) => (
              <WatchlistRow
                key={company.symbol}
                company={company}
                quote={quotes.get(company.symbol) ?? null}
              />
            ))}
          </nav>
        )}

        <AddTicker available={available} />
      </div>
    </aside>
  );
}
