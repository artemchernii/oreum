"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

/**
 * Add a ticker. The symbol is a foreign key into `companies`, so the database
 * rejects anything outside the universe — "pick from the universe, not free
 * text" is enforced by the schema rather than by the form.
 */
export async function addTicker(formData: FormData) {
  const user = await requireUser();
  const symbol = String(formData.get("symbol") ?? "")
    .trim()
    .toUpperCase();

  if (!symbol) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("watchlist")
    .insert({ user_id: user.id, symbol });

  // Adding a ticker that is already there is not an error worth surfacing.
  if (error && error.code !== "23505") throw error;

  revalidatePath("/", "layout");
}

export async function removeTicker(formData: FormData) {
  await requireUser();
  const symbol = String(formData.get("symbol") ?? "")
    .trim()
    .toUpperCase();

  if (!symbol) return;

  const supabase = await createClient();
  // No user_id filter: RLS scopes the delete to the caller's own rows.
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("symbol", symbol);

  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
