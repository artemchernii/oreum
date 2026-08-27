"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isProviderEnabled } from "@/lib/auth-providers";
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

/**
 * Sends the magic link.
 *
 * This runs on the server on purpose. PKCE stores a code verifier when the
 * link is requested and reads it back in /auth/callback — doing the first half
 * in the browser and the second on the server means two different cookie
 * stores, which surfaces as "PKCE code verifier not found in storage". Sending
 * from a server action keeps both halves in the same httpOnly store.
 */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const rawNext = String(formData.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!email) redirect("/login?error=Enter+an+email+address");

  // `type="email"` in the browser accepts "a@b". Checking for a dot in the
  // domain here rather than with a `pattern` attribute: a regex inside a JSX
  // string is an escaping trap, and validation the user cannot bypass belongs
  // on the server regardless.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(
      `/login?error=${encodeURIComponent("That email address doesn't look complete — check the domain.")}`,
    );
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // The email template controls the actual link; this is the origin the
      // template's {{ .RedirectTo }} resolves to, and must be on Supabase's
      // redirect allow-list.
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

/**
 * OAuth sign-in. Unlike a magic link, this flow starts and ends in the same
 * browser, so PKCE works exactly as designed — the verifier written here is
 * still there when /auth/callback exchanges the code.
 */
export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "") as Provider;
  const rawNext = String(formData.get("next") ?? "/");
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Defence in depth: the button is not rendered unless the provider is
  // configured, but a hand-crafted POST should not reach Supabase either.
  if (!isProviderEnabled(provider)) {
    redirect(
      `/login?error=${encodeURIComponent("That sign-in method isn't available yet.")}`,
    );
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "Could not start sign-in")}`,
    );
  }

  // Supabase returns the provider URL rather than redirecting itself.
  redirect(data.url);
}
