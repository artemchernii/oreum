import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the auth cookies and turns anonymous visitors away.
 *
 * This runs from `proxy.ts`, which is the only place it can: a Server
 * Component cannot write cookies, so a refreshed token would have nowhere to
 * go. Next advises against putting logic in Proxy, and against network calls
 * there in particular — `getClaims()` verifies the JWT locally rather than
 * calling the auth server, so this stays a cookie operation.
 *
 * Adapted from shadcn's `@supabase/supabase-client-nextjs`. The original
 * redirects to `/auth/login`, which does not exist here.
 */

/** Reachable without a session. Everything else requires one. */
const PUBLIC_PATHS = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(). A simple
  // mistake here is very hard to debug — it shows up as users being randomly
  // logged out.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!claims && !isPublic) {
    const url = new URL("/login", request.url);
    // Come back to where they were headed once they have a session.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Must be returned as-is. Building a different response without copying
  // these cookies across desynchronises the browser and the server and cuts
  // the session short.
  return supabaseResponse;
}
