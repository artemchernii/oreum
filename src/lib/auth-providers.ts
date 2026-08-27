/**
 * Which OAuth providers are actually configured in Supabase.
 *
 * There is no way to ask Supabase this with a publishable key, and
 * `signInWithOAuth` is no help: it returns an authorize URL happily even for a
 * disabled provider, and the failure only appears once the browser follows it —
 * as a raw JSON error page with no way back to the app.
 *
 * So it is declared. Server-side only; this decides what renders, and the
 * browser has no use for it.
 */
export type OAuthProvider = "github" | "google";

const SUPPORTED: OAuthProvider[] = ["github", "google"];

export function enabledProviders(): OAuthProvider[] {
  const raw = process.env.AUTH_PROVIDERS ?? "";

  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is OAuthProvider =>
      SUPPORTED.includes(p as OAuthProvider),
    );
}

export function isProviderEnabled(provider: string): provider is OAuthProvider {
  return enabledProviders().includes(provider as OAuthProvider);
}
