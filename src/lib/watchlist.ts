import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type UniverseCompany = {
  symbol: string;
  name: string;
  sectorLine: string;
};

/**
 * The user's watchlist, joined to the universe.
 *
 * No `.eq("user_id", ...)` filter here on purpose: RLS already restricts the
 * rows to the caller. Filtering in the query as well would imply the policy is
 * doing something else, and would keep working if the policy were dropped.
 */
export async function getWatchlist(): Promise<UniverseCompany[]> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watchlist")
    .select("symbol, companies (symbol, name, sector_line)")
    .order("added_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const company = row.companies as unknown as {
        symbol: string;
        name: string;
        sector_line: string;
      } | null;
      return company
        ? {
            symbol: company.symbol,
            name: company.name,
            sectorLine: company.sector_line,
          }
        : null;
    })
    .filter((c): c is UniverseCompany => c !== null);
}

/** The full universe. Reference data, readable signed out. */
export async function getUniverse(): Promise<UniverseCompany[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("symbol, name, sector_line")
    .order("symbol", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((c) => ({
    symbol: c.symbol,
    name: c.name,
    sectorLine: c.sector_line,
  }));
}

export async function getCompany(
  symbol: string,
): Promise<UniverseCompany | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("symbol, name, sector_line")
    .eq("symbol", symbol.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    symbol: data.symbol,
    name: data.name,
    sectorLine: data.sector_line,
  };
}
