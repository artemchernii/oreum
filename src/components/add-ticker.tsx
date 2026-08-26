import { Plus } from "lucide-react";
import type { UniverseCompany } from "@/lib/watchlist";
import { addTicker } from "@/app/actions";

/**
 * A native `<details>` disclosure rather than a search box, so this stays a
 * Server Component. The universe is twenty-five hand-curated companies — small
 * enough to list in full, which also makes "pick from the universe, not free
 * text" visible in the UI rather than only enforced in the schema.
 */
export function AddTicker({ available }: { available: UniverseCompany[] }) {
  if (available.length === 0) {
    return (
      <p className="px-2 pt-1 text-xs text-muted-foreground">
        Every company in the universe is on your watchlist.
      </p>
    );
  }

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="size-3.5" aria-hidden="true" />
        Add ticker
      </summary>

      <ul className="mt-1 max-h-72 overflow-y-auto rounded-md border p-1">
        {available.map((company) => (
          <li key={company.symbol}>
            <form action={addTicker}>
              <input type="hidden" name="symbol" value={company.symbol} />
              <button
                type="submit"
                className="flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
              >
                <span className="num shrink-0 text-sm font-medium">
                  {company.symbol}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {company.name}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </details>
  );
}
