import { Suspense, type ReactNode } from "react";
import { TopBar } from "@/components/top-bar";
import { WatchlistSidebar } from "@/components/watchlist-sidebar";
import { WatchlistSidebarSkeleton } from "@/components/watchlist-sidebar-skeleton";

/**
 * Lives in the root layout rather than a route group: both routes share it and
 * there is no third route to differentiate yet.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopBar />
      <div className="flex">
        {/*
          The sidebar now queries prices as well as the watchlist, so it is the
          slowest thing on the page. Without this boundary its query blocks the
          whole route — the feed would wait on the sidebar for no reason, since
          neither needs the other's data.
        */}
        <Suspense fallback={<WatchlistSidebarSkeleton />}>
          <WatchlistSidebar />
        </Suspense>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
