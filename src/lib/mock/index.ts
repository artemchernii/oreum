export { companies, sparklines } from "./companies";
export { edges, edgesFor } from "./edges";
export {
  events,
  impacts,
  impactsFor,
  eventById,
  filteredOutCount,
} from "./events";

import { companies, sparklines } from "./companies";

export function companyBySymbol(symbol: string) {
  return companies.find((c) => c.symbol === symbol.toUpperCase());
}

export type MockQuote = {
  price: number;
  changePercent: number;
  series: number[];
};

/**
 * Price data for the six companies that have it. The universe is 25, so most
 * symbols return null and render as an em dash rather than an invented number
 * — M3 is what fills this in, and a plausible fake would hide that gap.
 */
export function quoteFor(symbol: string): MockQuote | null {
  const company = companyBySymbol(symbol);
  const series = sparklines[symbol.toUpperCase()];
  if (!company || !series) return null;

  return {
    price: company.price,
    changePercent: company.changePercent,
    series,
  };
}
