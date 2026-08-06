import type { Edge } from "@/lib/types";

/**
 * Typed connections. Direction of impact is read off `kind`, never off how a
 * headline sounds: a capex increase at a customer is mechanically a tailwind
 * for its supplier regardless of the tone of the coverage.
 */
export const edges: Edge[] = [
  { from: "MSFT", to: "NVDA", kind: "customer" },
  { from: "MSFT", to: "AVGO", kind: "customer" },
  { from: "META", to: "NVDA", kind: "customer" },
  { from: "GOOGL", to: "AVGO", kind: "customer" },
  { from: "GOOGL", to: "NVDA", kind: "customer" },
  { from: "TSM", to: "NVDA", kind: "foundry" },
  { from: "TSM", to: "AVGO", kind: "foundry" },
  { from: "AVGO", to: "NVDA", kind: "competitor" },
  { from: "GOOGL", to: "MSFT", kind: "competitor" },
  { from: "META", to: "GOOGL", kind: "competitor" },
];

export function edgesFor(symbol: string): Edge[] {
  return edges.filter((e) => e.from === symbol || e.to === symbol);
}
