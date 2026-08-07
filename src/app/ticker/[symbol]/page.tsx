import { notFound } from "next/navigation";
import {
  companies,
  companyBySymbol,
  edgesFor,
  eventById,
  impactsFor,
} from "@/lib/mock";
import { TickerHeader } from "@/components/ticker-header";
import { ChartPlaceholder } from "@/components/chart-placeholder";
import { MetricsRow } from "@/components/metrics-row";
import { ExposuresCard } from "@/components/exposures-card";
import { DriverList, type Driver } from "@/components/driver-list";
import { ConnectionsCard } from "@/components/connections-card";

export function generateStaticParams() {
  return companies.map((company) => ({ symbol: company.symbol }));
}

export default async function TickerPage({ params }: PageProps<"/ticker/[symbol]">) {
  const { symbol } = await params;
  const company = companyBySymbol(symbol);

  if (!company) {
    notFound();
  }

  const drivers: Driver[] = impactsFor(company.symbol)
    .map((impact) => {
      const event = eventById(impact.eventId);
      return event ? { impact, event } : null;
    })
    .filter((driver): driver is Driver => driver !== null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
      <TickerHeader company={company} />
      <ChartPlaceholder markers={Math.min(drivers.length, 4)} />
      <MetricsRow metrics={company.metrics} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <DriverList drivers={drivers} />
        <div className="flex flex-col gap-6">
          <ExposuresCard exposures={company.exposures} />
          <ConnectionsCard
            symbol={company.symbol}
            edges={edgesFor(company.symbol)}
          />
        </div>
      </div>
    </div>
  );
}
