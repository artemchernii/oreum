import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, humanizeAuthError } from "@/components/form-error";
import { ProviderButtons } from "@/components/provider-buttons";
import { sendMagicLink } from "@/app/actions";

export const metadata: Metadata = { title: "Sign in · Oreum" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  const rawNext = typeof params.next === "string" ? params.next : "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const sent = typeof params.sent === "string" ? params.sent : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border p-6">
        <div className="flex justify-center pb-4">
          <LogoMark />
        </div>

        <h1 className="text-center text-lg font-semibold tracking-tight">
          {sent ? "Check your inbox" : "Welcome back"}
        </h1>

        {sent ? (
          <p className="pt-2 text-center text-sm text-muted-foreground">
            A sign-in link is on its way to{" "}
            <span className="font-medium text-foreground">{sent}</span>. It
            expires in an hour.
          </p>
        ) : (
          <>
            <p className="pb-5 pt-1 text-center text-sm text-muted-foreground">
              Sign in to see what&rsquo;s moving your watchlist.
            </p>

            {/*
              A plain server action. No client component, so the form works
              before hydration and the PKCE verifier is written by the same
              server-side cookie store that /auth/callback reads it from.
            */}
            <form action={sendMagicLink} className="flex flex-col gap-3">
              <input type="hidden" name="next" value={next} />
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@firm.com"
                // type=email alone accepts "a@b"; this requires a dot in the
                // domain, which is what people actually mistype.
                pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+"
                title="Enter a full email address, for example you@firm.com"
              />
              <Button type="submit">Send me a link</Button>
            </form>

            <div className="flex items-center gap-3 py-4">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <ProviderButtons next={next} />
          </>
        )}

        {error && <FormError>{humanizeAuthError(error)}</FormError>}
      </div>
    </div>
  );
}
