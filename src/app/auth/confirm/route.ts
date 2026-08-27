import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing point, using `token_hash` + `verifyOtp`.
 *
 * This deliberately avoids the PKCE `?code=` exchange. PKCE requires a code
 * verifier stored when the link is requested and read back when it is
 * clicked; a link opened from a mail client is a fresh top-level navigation,
 * and any mismatch between where the verifier was written and where it is
 * read fails with "PKCE code verifier not found in storage".
 *
 * `verifyOtp` needs no verifier at all — the token in the URL is the whole
 * credential — which is why Supabase's own SSR guidance uses it.
 *
 * Requires the email template to send `token_hash` rather than the default
 * ConfirmationURL. See docs/auth.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Relative paths only — an absolute `next` would make this an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That link is missing its token. Request a new one.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
