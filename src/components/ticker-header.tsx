import type { Company } from "@/lib/types";
import { Price, PriceChange } from "@/components/price-change";

export function TickerHeader({ company }: { company: Company }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="num text-2xl font-semibold tracking-tight">
        {company.symbol}
      </h1>
      <Price value={company.price} className="text-2xl" />
      <PriceChange percent={company.changePercent} className="text-base" />
      <div className="w-full">
        <p className="text-sm font-medium">{company.name}</p>
        <p className="text-xs text-muted-foreground">{company.sectorLine}</p>
      </div>
    </div>
  );
}
