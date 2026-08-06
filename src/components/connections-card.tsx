import Link from "next/link";
import type { Edge, EdgeKind } from "@/lib/types";

const kindLabel: Record<EdgeKind, string> = {
  customer: "Customers",
  foundry: "Foundry",
  supplier: "Suppliers",
  competitor: "Competitors",
};

const order: EdgeKind[] = ["customer", "foundry", "supplier", "competitor"];

/**
 * The graph, rendered flat. Grouping by edge kind matters because the kind is
 * what determines impact direction later — a customer's capex increase is a
 * tailwind, a competitor's product launch is not.
 */
export function ConnectionsCard({
  symbol,
  edges,
}: {
  symbol: string;
  edges: Edge[];
}) {
  const grouped = order
    .map((kind) => ({
      kind,
      symbols: edges
        .filter((edge) => edge.kind === kind)
        .map((edge) => (edge.from === symbol ? edge.to : edge.from))
        .filter((other, index, all) => all.indexOf(other) === index),
    }))
    .filter((group) => group.symbols.length > 0);

  return (
    <section className="rounded-lg border">
      <h2 className="border-b px-4 py-2.5 text-sm font-medium">Connections</h2>
      <div className="flex flex-col gap-3 px-4 py-3">
        {grouped.map((group) => (
          <div key={group.kind}>
            <div className="text-xs text-muted-foreground">
              {kindLabel[group.kind]}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {group.symbols.map((other) => (
                <Link
                  key={other}
                  href={`/ticker/${other}`}
                  className="num rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent"
                >
                  {other}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
