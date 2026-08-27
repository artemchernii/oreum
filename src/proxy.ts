import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * `middleware` was renamed to `proxy` in Next 16 — every Supabase SSR guide
 * still says `middleware.ts`.
 *
 * This file must sit level with `app`, so `src/proxy.ts`, not the repo root.
 * At the root it is silently ignored: no error, no build output, and auth
 * appears to work because the data access layer redirects anyway.
 *
 * The only job here is refreshing auth cookies, which nothing else can do:
 * Server Components cannot write cookies. Authorisation itself lives in
 * `src/lib/auth.ts`, next to the queries it protects, per the Next auth guide.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, the health check, and /auth.
     *
     * /auth is excluded rather than merely allowed through: the callback is
     * the request that exchanges a code for a session, and running another
     * Supabase client over the same cookies first is how the PKCE verifier
     * goes missing. Nothing there needs a session refreshed — it is creating
     * one.
     *
     * Without the asset exclusions this runs on CSS, JS and images too, and
     * the redirect would stop them loading on the login page itself.
     */
    "/((?!_next/static|_next/image|auth/|api/health|favicon.svg|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
