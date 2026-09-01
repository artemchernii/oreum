import Link from "next/link";
import { X } from "lucide-react";
import type { UniverseCompany } from "@/lib/watchlist";
import type { Quote } from "@/lib/quotes";
import { Price, PriceChange } from "@/components/price-change";
import { Sparkline } from "@/components/sparkline";
import { removeTicker } from "@/app/actions";

export function WatchlistRow({
  company,
  quote,
}: {
  company: UniverseCompany;
  // Passed in rather than fetched here — see WatchlistSidebar for why.
  quote: Quote | null;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
      <Link href={`/ticker/${company.symbol}`} className="flex min-w-0 flex-1">
        {/* min-w-0 so a long name truncates instead of pushing the figures out. */}
        <div className="min-w-0 flex-1">
          <div className="num text-sm font-medium">{company.symbol}</div>
          <div className="truncate text-xs text-muted-foreground">
            {company.name}
          </div>
        </div>
      </Link>

      {quote ? (
        <>
          <Sparkline
            points={quote.series}
            className="shrink-0 text-muted-foreground"
          />
          {/*
            Fixed width and right alignment: without both, a negative sign
            shifts the column and the figures stop scanning vertically.
          */}
          <div className="w-18 shrink-0 text-right">
            <Price value={quote.price} className="block text-sm" />
            {quote.changePercent === null ? (
              // One bar only, so there is nothing to compare against. A
              // 0.00% here would read as "unchanged", which is a different
              // claim from "unknown".
              <span className="num block text-xs text-muted-foreground">
                &mdash;
              </span>
            ) : (
              <PriceChange
                percent={quote.changePercent}
                className="block text-xs"
              />
            )}
          </div>
        </>
      ) : (
        // No invented number: this symbol has no cached bars yet.
        <div className="w-18 shrink-0 text-right text-sm text-muted-foreground">
          <span aria-label="No price data yet">&mdash;</span>
        </div>
      )}

      <form action={removeTicker} className="shrink-0">
        <input type="hidden" name="symbol" value={company.symbol} />
        <button
          type="submit"
          aria-label={`Remove ${company.symbol} from watchlist`}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
