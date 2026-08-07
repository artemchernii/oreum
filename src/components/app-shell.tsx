import type { ReactNode } from "react";
import { TopBar } from "@/components/top-bar";
import { WatchlistSidebar } from "@/components/watchlist-sidebar";

/**
 * Lives in the root layout rather than a route group: both routes share it and
 * there is no third route to differentiate yet.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <WatchlistSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
