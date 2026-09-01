import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * A Supabase client holding the secret key, which **bypasses RLS entirely**.
 *
 * It exists for one job: writing to `daily_bars`, which deliberately has no
 * insert policy at all. Nothing holding a publishable key can write prices, so
 * ingestion needs a key that outranks the policies.
 *
 * Rules that follow from that:
 *
 * - Never import this from a client component, and never from anything a
 *   client component imports. `SUPABASE_SECRET_KEY` has no `NEXT_PUBLIC_`
 *   prefix, so a stray import fails the build rather than leaking — but the
 *   rule is worth stating, because the failure is confusing if unexpected.
 * - Never use it to read user data. `getWatchlist()` relies on RLS to scope
 *   rows to the caller; the same query through this client returns everyone's.
 *
 * Not a module-level singleton, matching `supabase/server.ts` — a client
 * cached across invocations misbehaves on Fluid compute.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are both required",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    // There is no user and no session to keep. Left on, the client writes
    // token state it will never read again.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
