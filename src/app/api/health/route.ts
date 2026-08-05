/**
 * Connection check for Supabase.
 *
 * Hits the GoTrue health endpoint, which answers before any table exists —
 * the schema is M2. It validates the key: a wrong or missing one gets 401,
 * so a 200 really does mean the URL and the publishable key are both good.
 *
 * Not the REST root (`/rest/v1/`): under the new API key system that endpoint
 * answers "Only secret API keys can be used for this endpoint" and 401s for a
 * publishable key, because schema introspection is privileged.
 *
 * Never include the key in the response.
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

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "Supabase unreachable" },
      { status: 502 },
    );
  }
}
