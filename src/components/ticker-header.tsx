import { Price, PriceChange } from "@/components/price-change";

export function TickerHeader({
  symbol,
  name,
  sectorLine,
  price,
  changePercent,
}: {
  symbol: string;
  name: string;
  sectorLine: string;
  price?: number;
  changePercent?: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="num text-2xl font-semibold tracking-tight">{symbol}</h1>

      {price !== undefined && changePercent !== undefined ? (
        <>
          <Price value={price} className="text-2xl" />
          <PriceChange percent={changePercent} className="text-base" />
        </>
      ) : (
        <span className="num text-2xl text-muted-foreground" aria-label="No price data yet">
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
