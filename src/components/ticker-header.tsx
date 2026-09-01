import { Price, PriceChange } from "@/components/price-change";
import { formatTradeDate } from "@/lib/quotes";

export function TickerHeader({
  symbol,
  name,
  sectorLine,
  price,
  changePercent,
  asOf,
}: {
  symbol: string;
  name: string;
  sectorLine: string;
  price?: number;
  changePercent?: number | null;
  asOf?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="num text-2xl font-semibold tracking-tight">{symbol}</h1>

      {price !== undefined ? (
        <>
          <Price value={price} className="text-2xl" />
          {changePercent !== null && changePercent !== undefined && (
            <PriceChange percent={changePercent} className="text-base" />
          )}
          {asOf && (
            /*
              The provider's free tier never serves the current session, so
              this figure is a previous close and saying otherwise would be a
              quiet lie. Labelling it costs one line and makes the staleness
              a fact on screen rather than a trap.
            */
            <span className="num text-xs text-muted-foreground">
              Close · {formatTradeDate(asOf)}
            </span>
          )}
        </>
      ) : (
        <span
          className="num text-2xl text-muted-foreground"
          aria-label="No price data yet"
        >
          &mdash;
        </span>
      )}

      <div className="w-full">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{sectorLine}</p>
      </div>
    </div>
  );
}
