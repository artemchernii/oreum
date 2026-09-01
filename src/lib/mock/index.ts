export { companies } from "./companies";
export { edges, edgesFor } from "./edges";
export {
  events,
  impacts,
  impactsFor,
  eventById,
  filteredOutCount,
} from "./events";

import { companies } from "./companies";

export function companyBySymbol(symbol: string) {
  return companies.find((c) => c.symbol === symbol.toUpperCase());
}
