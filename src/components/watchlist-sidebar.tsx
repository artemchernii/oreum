import { companies, sparklines } from "@/lib/mock";
import { WatchlistRow } from "@/components/watchlist-row";

export function WatchlistSidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <div className="sticky top-14 p-3">
        <h2 className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Watchlist
        </h2>
        <nav className="flex flex-col gap-0.5">
          {companies.map((company) => (
            <WatchlistRow
              key={company.symbol}
              company={company}
              series={sparklines[company.symbol]}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
