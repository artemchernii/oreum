"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the signed-in app.
 *
 * Copy follows the design bundle's "Error / offline" screen, with one
 * deliberate omission: the mock shows "Last updated 12 minutes ago", and an
 * error boundary has no access to when the cache was last written. Inventing a
 * duration to fill the slot would be exactly the failure this app avoids
 * elsewhere with the em dash.
 *
 * The reassurance is load-bearing and it is also true: the watchlist lives in
 * Supabase behind RLS and is unaffected by the price provider being down.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // deliberately withholds from the client in production.
    console.error("app error", error.digest, error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <span
        className="flex size-9 items-center justify-center rounded-full border"
        aria-hidden="true"
      >
        <TriangleAlert className="size-4" />
      </span>

      <h1 className="text-lg font-medium">Can&rsquo;t reach the market data</h1>

      <p className="text-sm text-muted-foreground">
        Prices and news are paused. Your watchlist and settings are safe.
      </p>

      <Button onClick={reset} variant="outline" size="sm" className="mt-1">
        Retry
      </Button>
    </div>
  );
}
