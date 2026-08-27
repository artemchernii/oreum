import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where every sign-in lands: magic link and OAuth alike.
 *
 * Handles both shapes Supabase can send, because which one arrives depends on
 * the email template, and template editing is locked behind custom SMTP:
 *
 *   ?token_hash=…&type=…  a custom template using {{ .TokenHash }}. The token
 *                         is the whole credential — nothing to remember
 *                         between requesting the link and clicking it.
 *
 *   ?code=…               the default {{ .ConfirmationURL }} template, and all
 *                         OAuth. PKCE: needs the code verifier cookie written
 *                         when the flow started, so it only works if the link
 *                         opens in the browser that began it.
 *
 * token_hash is preferred where available. It is the robust one for email,
 * since a mail client decides which browser opens the link, not the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";

  // Relative paths only — an absolute `next` would make this an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  let message: string | null = null;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    message = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    message = error?.message ?? null;
  } else {
    message = "That link was incomplete. Request a new one below.";
  }

  if (message) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
