import { notFound } from "next/navigation";
import { companyBySymbol, eventById, impactsFor, quoteFor } from "@/lib/mock";
import { getCompany } from "@/lib/watchlist";
import { edgesFor } from "@/lib/mock/edges";
import { TickerHeader } from "@/components/ticker-header";
import { ChartPlaceholder } from "@/components/chart-placeholder";
import { MetricsRow } from "@/components/metrics-row";
import { ExposuresCard } from "@/components/exposures-card";
import { DriverList, type Driver } from "@/components/driver-list";
import { ConnectionsCard } from "@/components/connections-card";

export default async function TickerPage({
  params,
}: PageProps<"/ticker/[symbol]">) {
  const { symbol } = await params;

  // The universe is the authority on whether a ticker exists. Anything not in
  // the table is a 404, which is what the not-found copy already says.
  const company = await getCompany(symbol);
  if (!company) notFound();

  const quote = quoteFor(company.symbol);
  const details = companyBySymbol(company.symbol);

  const drivers: Driver[] = impactsFor(company.symbol)
    .map((impact) => {
      const event = eventById(impact.eventId);
      return event ? { impact, event } : null;
    })
    .filter((driver): driver is Driver => driver !== null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
      <TickerHeader
        symbol={company.symbol}
        name={company.name}
        sectorLine={company.sectorLine}
        price={quote?.price}
        changePercent={quote?.changePercent}
      />

      <ChartPlaceholder markers={Math.min(drivers.length, 4)} />

      {/*
        Metrics and exposures are hand-curated and only exist for the six
        companies seeded with them. M4 fills the rest; until then the sections
        are absent rather than empty, which is the honest state.
      */}
      {details && <MetricsRow metrics={details.metrics} />}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {drivers.length > 0 ? (
          <DriverList drivers={drivers} />
        ) : (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            No events have touched {company.symbol} yet. Ingestion arrives in M4.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {details && <ExposuresCard exposures={details.exposures} />}
          <ConnectionsCard
            symbol={company.symbol}
            edges={edgesFor(company.symbol)}
          />
        </div>
      </div>
    </div>
  );
}
