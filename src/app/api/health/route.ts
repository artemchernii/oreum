import { createClient } from "@/lib/supabase/server";
import { isStale, tradeDateAgeDays } from "@/lib/freshness";

/**
 * Connection check for Supabase, plus how fresh the price cache is.
 *
 * The freshness half exists because the ingestion cron is otherwise
 * unobservable. It runs once a day, writes to `console.error` on failure, and
 * nobody reads Vercel logs. A silently broken job would surface weeks later as
 * a flat sparkline — which is exactly the failure the gap-filling design was
 * built to prevent, arriving by a different route.
 *
 * Read with the publishable key: `daily_bars` is readable by policy, so this
 * needs no privilege, and a health endpoint holding a secret would be a poor
 * trade for a number that is public anyway.
 *
 * Never include a key in the response.
 */

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return Response.json(
      { ok: false, error: "Supabase env vars are missing" },
      { status: 500 },
    );
  }

  try {
    // GoTrue answers before any table exists and validates the key: a wrong
    // or missing one gets 401, so a 200 means URL and key are both good.
    //
    // Not the REST root (`/rest/v1/`) — under the new API key system that
    // answers "Only secret API keys can be used for this endpoint" and 401s
    // for a publishable key, because schema introspection is privileged.
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: `Supabase answered ${res.status}` },
        { status: 502 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("daily_bars")
      .select("trade_date")
      .order("trade_date", { ascending: false })
      .limit(1);

    if (error) {
      return Response.json(
        { ok: false, error: "Price cache unreadable" },
        { status: 502 },
      );
    }

    const latest = data?.[0]?.trade_date ?? null;
    const ageDays = latest ? tradeDateAgeDays(latest, new Date()) : null;
    const stale = isStale(ageDays);

    // `ok` stays about reachability. Staleness is reported rather than treated
    // as an outage: the app works fine on slightly old closes, and conflating
    // the two would make a real connection failure harder to spot.
    return Response.json({
      ok: true,
      prices: { latestTradeDate: latest, ageDays, stale },
    });
  } catch {
    return Response.json(
      { ok: false, error: "Supabase unreachable" },
      { status: 502 },
    );
  }
}
