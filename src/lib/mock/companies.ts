import type { Company } from "@/lib/types";

/**
 * Six of the ~25 in the universe. Metrics carry an anchor because a P/E of 34
 * says nothing on its own; exposures are hand-curated and dated.
 */
export const companies: Company[] = [
  {
    symbol: "AVGO",
    name: "Broadcom Inc.",
    sectorLine: "Semiconductors · Custom silicon, networking, infrastructure software",
    price: 1742.18,
    changePercent: 2.41,
    metrics: [
      { label: "P/E", value: "38.2", anchorLabel: "5y avg", anchorValue: "31.4" },
      { label: "Gross margin", value: "76.4%", anchorLabel: "prior year", anchorValue: "74.1%" },
      { label: "Rev. growth", value: "44.1%", anchorLabel: "prior year", anchorValue: "8.2%" },
      { label: "FCF margin", value: "41.7%", anchorLabel: "peer median", anchorValue: "28.3%" },
      { label: "Net debt / EBITDA", value: "2.1x", anchorLabel: "5y avg", anchorValue: "3.4x" },
    ],
    exposures: [
      {
        label: "Hyperscaler capex share",
        value: "~38% of revenue",
        note: "Custom accelerators and networking sold into four hyperscalers. Concentrated, and the concentration is the thesis.",
        reviewedAt: "2026-07-14",
        sourceNote: "FY25 10-K, segment disclosure",
      },
      {
        label: "Foundry dependency",
        value: "TSMC, N3 and N5",
        note: "No second source at the leading node. A TSMC capacity constraint is a Broadcom revenue constraint one quarter later.",
        reviewedAt: "2026-07-14",
        sourceNote: "FY25 10-K, risk factors",
      },
      {
        label: "China revenue",
        value: "19%",
        note: "Down from 32% two years ago as export controls tightened.",
        reviewedAt: "2026-06-30",
        sourceNote: "Q3 FY26 10-Q, geographic segment",
      },
    ],
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    sectorLine: "Semiconductors · Accelerated computing, data centre GPUs",
    price: 218.44,
    changePercent: -1.18,
    metrics: [
      { label: "P/E", value: "48.6", anchorLabel: "5y avg", anchorValue: "62.1" },
      { label: "Gross margin", value: "74.9%", anchorLabel: "prior year", anchorValue: "75.8%" },
      { label: "Rev. growth", value: "62.3%", anchorLabel: "prior year", anchorValue: "114.0%" },
      { label: "FCF margin", value: "48.2%", anchorLabel: "peer median", anchorValue: "28.3%" },
      { label: "Inventory days", value: "108", anchorLabel: "5y avg", anchorValue: "84" },
    ],
    exposures: [
      {
        label: "Hyperscaler capex share",
        value: "~52% of revenue",
        note: "Four customers account for more than half of data centre revenue. The single largest exposure in the universe.",
        reviewedAt: "2026-07-20",
        sourceNote: "FY26 10-K, customer concentration",
      },
      {
        label: "Foundry dependency",
        value: "TSMC N4/N3, CoWoS packaging",
        note: "Advanced packaging is the real bottleneck, not wafer starts.",
        reviewedAt: "2026-07-20",
        sourceNote: "FY26 10-K, supply chain",
      },
    ],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    sectorLine: "Software · Cloud infrastructure, productivity, licensing",
    price: 512.77,
    changePercent: 0.64,
    metrics: [
      { label: "P/E", value: "34.1", anchorLabel: "5y avg", anchorValue: "30.8" },
      { label: "Operating margin", value: "45.2%", anchorLabel: "prior year", anchorValue: "44.6%" },
      { label: "Rev. growth", value: "16.8%", anchorLabel: "prior year", anchorValue: "15.7%" },
      { label: "FCF margin", value: "29.4%", anchorLabel: "peer median", anchorValue: "24.1%" },
      { label: "Capex / revenue", value: "31.6%", anchorLabel: "5y avg", anchorValue: "17.2%" },
    ],
    exposures: [
      {
        label: "AI capex commitment",
        value: "$94B FY27 guidance",
        note: "Capex is now a third of revenue. On the spending side for Microsoft, on the revenue side for its suppliers.",
        reviewedAt: "2026-08-01",
        sourceNote: "FY26 Q4 earnings call",
      },
      {
        label: "Azure revenue concentration",
        value: "42% of total",
        note: "Growth is increasingly a single-segment story.",
        reviewedAt: "2026-08-01",
        sourceNote: "FY26 10-K, segment results",
      },
    ],
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    sectorLine: "Internet · Search advertising, cloud, custom TPU silicon",
    price: 284.92,
    changePercent: 1.07,
    metrics: [
      { label: "P/E", value: "26.4", anchorLabel: "5y avg", anchorValue: "24.9" },
      { label: "Operating margin", value: "34.8%", anchorLabel: "prior year", anchorValue: "32.1%" },
      { label: "Rev. growth", value: "14.2%", anchorLabel: "prior year", anchorValue: "13.6%" },
      { label: "FCF margin", value: "22.7%", anchorLabel: "peer median", anchorValue: "24.1%" },
      { label: "Capex / revenue", value: "24.9%", anchorLabel: "5y avg", anchorValue: "13.8%" },
    ],
    exposures: [
      {
        label: "Search revenue share",
        value: "56% of total",
        note: "The regulatory tail risk and the cash engine are the same line item.",
        reviewedAt: "2026-07-08",
        sourceNote: "FY25 10-K, revenue disaggregation",
      },
      {
        label: "Custom silicon",
        value: "TPU v7, Broadcom co-designed",
        note: "Reduces NVIDIA dependency and increases Broadcom dependency at the same time.",
        reviewedAt: "2026-07-08",
        sourceNote: "Public product disclosure",
      },
    ],
  },
  {
    symbol: "TSM",
    name: "Taiwan Semiconductor Manufacturing Co.",
    sectorLine: "Semiconductors · Contract manufacturing, advanced packaging",
    price: 342.15,
    changePercent: 3.02,
    metrics: [
      { label: "P/E", value: "29.8", anchorLabel: "5y avg", anchorValue: "22.3" },
      { label: "Gross margin", value: "58.9%", anchorLabel: "prior year", anchorValue: "54.2%" },
      { label: "Rev. growth", value: "38.4%", anchorLabel: "prior year", anchorValue: "30.1%" },
      { label: "Capex / revenue", value: "42.1%", anchorLabel: "5y avg", anchorValue: "46.8%" },
      { label: "Advanced node mix", value: "74%", anchorLabel: "prior year", anchorValue: "67%" },
    ],
    exposures: [
      {
        label: "Universe bottleneck",
        value: "Sole leading-edge supplier",
        note: "Half the universe depends on one company's capacity. This is why TSM is in the list whether or not it is held.",
        reviewedAt: "2026-07-22",
        sourceNote: "Hand-curated from customer 10-K risk factors",
      },
      {
        label: "Geographic concentration",
        value: "78% of capacity in Taiwan",
        note: "Arizona and Kumamoto reduce the number slowly. Advanced nodes remain concentrated.",
        reviewedAt: "2026-07-22",
        sourceNote: "FY25 20-F, property disclosure",
      },
    ],
  },
  {
    symbol: "META",
    name: "Meta Platforms, Inc.",
    sectorLine: "Internet · Social advertising, AI infrastructure",
    price: 738.51,
    changePercent: -0.42,
    metrics: [
      { label: "P/E", value: "27.9", anchorLabel: "5y avg", anchorValue: "23.7" },
      { label: "Operating margin", value: "41.3%", anchorLabel: "prior year", anchorValue: "38.9%" },
      { label: "Rev. growth", value: "19.4%", anchorLabel: "prior year", anchorValue: "21.9%" },
      { label: "FCF margin", value: "25.8%", anchorLabel: "peer median", anchorValue: "24.1%" },
      { label: "Capex / revenue", value: "28.7%", anchorLabel: "5y avg", anchorValue: "19.4%" },
    ],
    exposures: [
      {
        label: "Advertising revenue share",
        value: "97% of total",
        note: "Effectively a single-revenue-line business. Ad market softness is company-wide softness.",
        reviewedAt: "2026-07-11",
        sourceNote: "FY25 10-K, revenue disaggregation",
      },
      {
        label: "AI capex commitment",
        value: "$72B FY26 guidance",
        note: "Buys accelerators and networking without a custom silicon programme at scale.",
        reviewedAt: "2026-07-11",
        sourceNote: "FY26 Q2 earnings call",
      },
    ],
  },
];

/**
 * Static price series for the sidebar sparkline. Deliberately not on Company:
 * the eventual series lives in the M3 cache table, not the companies row.
 */
export const sparklines: Record<string, number[]> = {
  AVGO: [1612, 1598, 1634, 1671, 1655, 1689, 1702, 1688, 1714, 1698, 1726, 1742],
  NVDA: [232, 228, 234, 229, 221, 226, 219, 224, 217, 222, 221, 218],
  MSFT: [487, 492, 489, 498, 503, 497, 506, 511, 504, 509, 508, 513],
  GOOGL: [268, 271, 267, 274, 279, 276, 281, 278, 283, 280, 282, 285],
  TSM: [298, 304, 311, 307, 316, 322, 318, 327, 331, 329, 336, 342],
  META: [751, 744, 758, 749, 762, 755, 747, 741, 752, 745, 742, 739],
};
