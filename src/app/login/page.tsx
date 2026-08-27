import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { FormError, humanizeAuthError } from "@/components/form-error";
import { ProviderButtons } from "@/components/provider-buttons";
import { SubmitButton } from "@/components/submit-button";
import { AwaitingSignIn } from "@/components/awaiting-sign-in";
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
          <>
            <p className="pt-2 text-center text-sm text-muted-foreground">
              A sign-in link is on its way to{" "}
              <span className="font-medium text-foreground">{sent}</span>. It
              expires in an hour.
            </p>
            {/* The link opens wherever the mail client decides. This tab
                notices when that happens and follows along. */}
            <AwaitingSignIn next={next} />
          </>
        ) : (
          <>
            <p className="pb-5 pt-1 text-center text-sm text-muted-foreground">
              Sign in to see what&rsquo;s moving your watchlist.
            </p>

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
              />
              <SubmitButton pendingLabel="Sending…">
                Send me a link
              </SubmitButton>
            </form>

            <ProviderButtons next={next} />
          </>
        )}

        {error && <FormError>{humanizeAuthError(error)}</FormError>}
      </div>
    </div>
  );
}
