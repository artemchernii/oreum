import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the watchlist and its quotes load.
 *
 * Deliberately the same box model as `WatchlistSidebar` — same width, same row
 * height, same three columns. A skeleton whose shape differs from the content
 * it stands in for produces a layout jump, which reads as slower than showing
 * nothing at all.
 */
export function WatchlistSidebarSkeleton() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block" aria-hidden="true">
      <div className="sticky top-14 flex flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between px-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-14" />
        </div>

        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-14 shrink-0" />
              <div className="w-18 shrink-0 space-y-1.5">
                <Skeleton className="ml-auto h-3.5 w-14" />
                <Skeleton className="ml-auto h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
