import type { Event, EventImpact } from "@/lib/types";

/**
 * Headlines here are deliberately the length real ones are — press-release
 * titles run past fifteen words routinely. Short mock strings make every
 * layout look fine until production.
 */
export const events: Event[] = [
  {
    id: "evt-001",
    kind: "second_order",
    headline:
      "Microsoft Raises Fiscal 2027 Capital Expenditure Guidance to $94 Billion Citing Sustained Enterprise Demand for Azure AI Infrastructure Capacity",
    summary:
      "Microsoft lifted FY27 capex guidance by roughly 18% over the prior forecast, attributing it to Azure AI capacity commitments.",
    sources: [
      { outlet: "Reuters", url: "https://example.com/reuters/msft-capex" },
      { outlet: "Bloomberg", url: "https://example.com/bloomberg/msft-capex" },
      { outlet: "CNBC", url: "https://example.com/cnbc/msft-capex" },
    ],
    publishedAt: "2026-08-06T13:42:00Z",
    strength: 3,
  },
  {
    id: "evt-002",
    kind: "direct",
    headline:
      "Taiwan Semiconductor Reports Advanced Node Utilisation Above Ninety Percent and Signals Additional Capacity Expansion Across Arizona and Kumamoto Sites",
    summary:
      "TSMC said leading-edge utilisation exceeded 90% for a third consecutive quarter and brought forward expansion timelines.",
    sources: [
      { outlet: "Nikkei Asia", url: "https://example.com/nikkei/tsmc-utilisation" },
      { outlet: "DigiTimes", url: "https://example.com/digitimes/tsmc-utilisation" },
    ],
    publishedAt: "2026-08-06T09:15:00Z",
    strength: 3,
  },
  {
    id: "evt-003",
    kind: "macro",
    headline:
      "Federal Reserve Holds Benchmark Rate Steady While Signalling Two Possible Reductions Before the End of the Fiscal Year",
    summary:
      "The FOMC left rates unchanged and revised its dot plot toward two cuts in the second half.",
    sources: [{ outlet: "Federal Reserve", url: "https://example.com/fed/fomc" }],
    publishedAt: "2026-08-05T18:00:00Z",
    strength: 2,
  },
  {
    id: "evt-004",
    kind: "second_order",
    headline:
      "Alphabet Confirms Seventh-Generation Tensor Processing Unit Entering Volume Production With Co-Design Partner Named in Filing",
    summary:
      "Alphabet's TPU v7 moves to volume production, with Broadcom named as co-design partner in the filing.",
    sources: [
      { outlet: "The Information", url: "https://example.com/information/tpu-v7" },
      { outlet: "SEC filing", url: "https://example.com/sec/googl-8k" },
    ],
    publishedAt: "2026-08-05T21:30:00Z",
    strength: 3,
  },
  {
    id: "evt-005",
    kind: "direct",
    headline: "NVIDIA Data Centre Inventory Days Rise to 108 From 84 Year Over Year",
    summary:
      "Inventory days expanded again, which management attributed to pre-building ahead of a product transition.",
    sources: [{ outlet: "Barron's", url: "https://example.com/barrons/nvda-inventory" }],
    publishedAt: "2026-08-05T14:20:00Z",
    strength: 2,
  },
  {
    id: "evt-006",
    kind: "second_order",
    headline:
      "Meta Platforms Commits Additional Twelve Billion Dollars to Accelerator Procurement for Its 2027 Training Cluster Build-Out",
    summary:
      "Meta raised its FY26 capex guide, with the increment allocated to accelerator and networking procurement.",
    sources: [
      { outlet: "Reuters", url: "https://example.com/reuters/meta-capex" },
      { outlet: "The Verge", url: "https://example.com/verge/meta-capex" },
    ],
    publishedAt: "2026-08-04T16:45:00Z",
    strength: 2,
  },
  {
    id: "evt-007",
    kind: "macro",
    headline: "Dollar Index Reaches Fourteen-Month High Against a Basket of Major Trading Currencies",
    summary: "DXY closed at its highest level since June 2025 on rate differential expectations.",
    sources: [{ outlet: "FRED", url: "https://example.com/fred/dxy" }],
    publishedAt: "2026-08-04T20:10:00Z",
    strength: 1,
  },
  {
    id: "evt-008",
    kind: "direct",
    headline: "Broadcom Names New Head of Custom Silicon Business Unit",
    summary: "An internal appointment to lead the ASIC business, effective next quarter.",
    sources: [{ outlet: "Business Wire", url: "https://example.com/bw/avgo-exec" }],
    publishedAt: "2026-08-04T11:00:00Z",
    strength: 1,
  },
  {
    id: "evt-009",
    kind: "second_order",
    headline:
      "Commerce Department Expands Advanced Computing Export Licence Requirements to Cover Additional Networking Silicon Categories",
    summary:
      "The rule extends existing licence requirements to high-bandwidth networking parts previously outside scope.",
    sources: [
      { outlet: "Bureau of Industry and Security", url: "https://example.com/bis/rule" },
      { outlet: "Reuters", url: "https://example.com/reuters/bis-rule" },
    ],
    publishedAt: "2026-08-03T15:30:00Z",
    strength: 2,
  },
];

/**
 * evt-001 reaches four tickers: the spending company plus three suppliers.
 * That fan-out is the product's whole argument.
 */
export const impacts: EventImpact[] = [
  {
    eventId: "evt-001",
    symbol: "MSFT",
    direction: "neutral",
    reason: "Microsoft is spending the money, so the effect on its own margin is a cost, not a gain.",
    viaEdge: null,
  },
  {
    eventId: "evt-001",
    symbol: "AVGO",
    direction: "up",
    reason: "Microsoft is a custom silicon and networking customer, so higher capex is directly more orders.",
    viaEdge: { from: "MSFT", to: "AVGO", kind: "customer" },
  },
  {
    eventId: "evt-001",
    symbol: "NVDA",
    direction: "up",
    reason: "Microsoft buys accelerators at scale, so a larger capex budget expands the addressable order book.",
    viaEdge: { from: "MSFT", to: "NVDA", kind: "customer" },
  },
  {
    eventId: "evt-001",
    symbol: "TSM",
    direction: "up",
    reason: "Every accelerator in that budget is fabricated at TSMC, so the demand arrives one step later.",
    viaEdge: { from: "TSM", to: "NVDA", kind: "foundry" },
  },
  {
    eventId: "evt-002",
    symbol: "TSM",
    direction: "up",
    reason: "Utilisation above ninety percent supports pricing and signals demand exceeding current capacity.",
    viaEdge: null,
  },
  {
    eventId: "evt-002",
    symbol: "NVDA",
    direction: "down",
    reason: "A capacity-constrained sole foundry caps how many units can ship, regardless of order book size.",
    viaEdge: { from: "TSM", to: "NVDA", kind: "foundry" },
  },
  {
    eventId: "evt-002",
    symbol: "AVGO",
    direction: "down",
    reason: "Broadcom has no second source at the leading node, so the same constraint applies.",
    viaEdge: { from: "TSM", to: "AVGO", kind: "foundry" },
  },
  {
    eventId: "evt-003",
    symbol: "AVGO",
    direction: "neutral",
    reason:
      "A rate decision moves every position in the watchlist by roughly the same amount. It does not differentiate between them, and it is shown for context only.",
    viaEdge: null,
  },
  {
    eventId: "evt-004",
    symbol: "GOOGL",
    direction: "neutral",
    reason: "Alphabet moves spend from merchant silicon to its own design, trading one supplier for another.",
    viaEdge: null,
  },
  {
    eventId: "evt-004",
    symbol: "AVGO",
    direction: "up",
    reason: "Broadcom is the named co-design partner, so volume production converts to recognised revenue.",
    viaEdge: { from: "GOOGL", to: "AVGO", kind: "customer" },
  },
  {
    eventId: "evt-004",
    symbol: "NVDA",
    direction: "down",
    reason: "A customer shipping its own accelerator at volume displaces merchant GPU purchases.",
    viaEdge: { from: "GOOGL", to: "NVDA", kind: "customer" },
  },
  {
    eventId: "evt-005",
    symbol: "NVDA",
    direction: "down",
    reason: "Inventory days rising twenty-four days year over year ties up working capital ahead of a transition.",
    viaEdge: null,
  },
  {
    eventId: "evt-006",
    symbol: "META",
    direction: "neutral",
    reason: "Meta is the buyer, so the commitment is an expense against its own free cash flow.",
    viaEdge: null,
  },
  {
    eventId: "evt-006",
    symbol: "NVDA",
    direction: "up",
    reason: "Meta is an accelerator customer, so procurement earmarked for training clusters lands as orders.",
    viaEdge: { from: "META", to: "NVDA", kind: "customer" },
  },
  {
    eventId: "evt-007",
    symbol: "TSM",
    direction: "neutral",
    reason:
      "A stronger dollar affects every company in the watchlist with overseas revenue. It does not distinguish between positions.",
    viaEdge: null,
  },
  {
    eventId: "evt-008",
    symbol: "AVGO",
    direction: "neutral",
    reason: "An internal appointment with no disclosed change to strategy or guidance.",
    viaEdge: null,
  },
  {
    eventId: "evt-009",
    symbol: "AVGO",
    direction: "down",
    reason: "Networking silicon entering licence scope narrows the addressable market for existing parts.",
    viaEdge: null,
  },
  {
    eventId: "evt-009",
    symbol: "NVDA",
    direction: "down",
    reason: "Interconnect parts shipped with accelerator systems fall under the widened rule.",
    viaEdge: { from: "AVGO", to: "NVDA", kind: "competitor" },
  },
];

export function impactsFor(symbol: string): EventImpact[] {
  return impacts.filter((i) => i.symbol === symbol);
}

export function eventById(id: string): Event | undefined {
  return events.find((e) => e.id === id);
}

/**
 * Stand-in for the M6 filter. The count is permanent UI: if the filter drops
 * one item in ten, it is not working, and this is the only place that shows.
 */
export const filteredOutCount = 47;
