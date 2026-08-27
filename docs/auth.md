# Auth

Magic link, Supabase, no passwords.

## Why `token_hash` and not `?code=`

Supabase's default email template sends `{{ .ConfirmationURL }}`, which routes
through `/auth/v1/verify` and comes back to the app with `?code=`. Exchanging
that code uses **PKCE**: a code verifier is written when the link is requested
and must be read back when the link is clicked.

That breaks in ordinary use. A magic link is opened from a mail client, often
in a new tab or a different browser profile than the one that requested it. If
the verifier is not in the store the callback reads, the exchange fails with:

> PKCE code verifier not found in storage.

`verifyOtp({ type, token_hash })` needs no verifier — the token in the URL is
the entire credential. This is the flow Supabase documents for server-side
rendering, and it is what `src/app/auth/confirm/route.ts` implements.

`/auth/callback` is kept for the `?code=` flow, which OAuth would use if a
social provider is ever added. It is not on the magic-link path.

## Required dashboard configuration

Both of these are manual and neither is in the repo.

### 1. Email template

**Authentication → Emails → Magic Link.** Replace the link with:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Sign in
</a>
```

Do the same for **Confirm signup** if new accounts should land signed in. The
default `{{ .ConfirmationURL }}` will not work with the confirm route.

### 2. URL configuration

**Authentication → URL Configuration.**

- **Site URL** — `https://oreumapp.vercel.app`
- **Redirect URLs** — `http://localhost:3000/**` and
  `https://oreumapp.vercel.app/**`

`{{ .SiteURL }}` in the template resolves to Site URL, so local testing needs
the template pointed at localhost or the Site URL temporarily changed.

## Where authorisation happens

| Layer | Does |
| --- | --- |
| `src/proxy.ts` | refreshes cookies, redirects anonymous visitors. Optimistic — `getClaims()` verifies the JWT locally, no network call |
| `src/lib/auth.ts` | `requireUser()` revalidates with `getUser()`. **This** is the authorisation check |
| RLS policies | the last line. `auth.uid() = user_id`, enforced by Postgres regardless of application code |

`/auth` is excluded from the proxy matcher entirely. The confirm route is the
request that creates a session; running a second Supabase client over the same
cookies first is how session establishment goes wrong.

## Rate limits

Supabase's built-in email sender is throttled to a handful per hour on the free
tier and sends from a shared domain. A link that never arrives during testing
is usually that, not a bug. The fix is custom SMTP under **Project Settings →
Authentication → SMTP Settings**, not a different auth provider.
