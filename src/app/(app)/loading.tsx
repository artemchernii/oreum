import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading for the main column. The sidebar has its own boundary in
 * `AppShell`, so the two resolve independently rather than the slower one
 * holding the faster one back.
 *
 * Shaped like the feed: a heading row, the filtered-out notice, then cards.
 * Realistic proportions matter here — the mock headlines in this app run
 * fifteen words and up, so a skeleton sized for short ones would collapse the
 * moment real content arrived.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4 md:p-6">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-44" />
      </div>

      <Skeleton className="h-9 w-full rounded-lg" />

      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
