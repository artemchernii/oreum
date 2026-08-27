"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Watches for sign-in completing somewhere else.
 *
 * The magic link opens in whatever the mail client launches, leaving this tab
 * showing "check your inbox" forever. The session lands in a cookie shared
 * across tabs of the same browser, so this tab only needs to notice.
 *
 * Polling rather than BroadcastChannel: the sign-in may have happened in a
 * window that has already been closed, and a message has no listener then.
 * It stops after five minutes — by which point the link has expired anyway.
 */
const INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 120;

export function AwaitingSignIn({ next }: { next: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;

    const id = setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(id);
        if (!cancelled) setGaveUp(true);
        return;
      }

      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (!res.ok) return;
        const { signedIn } = (await res.json()) as { signedIn: boolean };
        if (signedIn && !cancelled) {
          clearInterval(id);
          router.replace(next);
          router.refresh();
        }
      } catch {
        // Offline or a transient failure. Keep waiting; the interval retries.
      }
    }, INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [next, router]);

  if (gaveUp) return null;

  return (
    <p className="pt-3 text-center text-xs text-muted-foreground">
      This page will continue on its own once you&rsquo;ve signed in.
    </p>
  );
}
