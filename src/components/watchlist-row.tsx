import Link from "next/link";
import type { Company } from "@/lib/types";
import { Price, PriceChange } from "@/components/price-change";
import { Sparkline } from "@/components/sparkline";

export function WatchlistRow({
  company,
  series,
}: {
  company: Company;
  series: number[];
}) {
  return (
    <Link
      href={`/ticker/${company.symbol}`}
      className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      {/* min-w-0 so a long name truncates instead of pushing the figures out. */}
      <div className="min-w-0 flex-1">
        <div className="num text-sm font-medium">{company.symbol}</div>
        <div className="truncate text-xs text-muted-foreground">
          {company.name}
        </div>
      </div>

      <Sparkline
        points={series}
        className="shrink-0 text-muted-foreground"
      />

      {/*
        Fixed width and right alignment: without both, a negative sign shifts
        the whole column and the figures stop scanning vertically.
      */}
      <div className="w-[4.5rem] shrink-0 text-right">
        <Price value={company.price} className="block text-sm" />
        <PriceChange percent={company.changePercent} className="block text-xs" />
      </div>
    </Link>
  );
}
