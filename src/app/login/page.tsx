import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Sign in · Oreum" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;

  // Read on the server and passed down as a prop. Using useSearchParams in the
  // form instead would opt the whole subtree out of prerendering, so the
  // server would ship an empty Suspense fallback and the form would only
  // appear once JS loaded.
  const rawNext = typeof params.next === "string" ? params.next : "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border p-6">
        <div className="flex justify-center pb-4">
          <LogoMark />
        </div>

        <h1 className="text-center text-lg font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="pb-5 pt-1 text-center text-sm text-muted-foreground">
          Sign in to see what&rsquo;s moving your watchlist.
        </p>

        <LoginForm next={next} initialError={error} />
      </div>
    </div>
  );
}
