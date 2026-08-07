/**
 * Permanent UI, not a debug affordance. It is the only place the product
 * shows its work — if the filter drops one item in ten, the filter is not
 * working, and this is where that becomes visible.
 */
export function FilteredNotice({ count }: { count: number }) {
  return (
    <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <span className="num tabular-nums">{count}</span> items filtered out as
      unrelated to your watchlist
    </p>
  );
}
