"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The only client component in M2. Magic link: no password to store, reset or
 * leak, which is also why this form is one field.
 *
 * `next` arrives as a prop rather than from useSearchParams, so this renders
 * on the server and works before hydration.
 */
export function LoginForm({
  next = "/",
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    initialError ? "error" : "idle",
  );
  const [message, setMessage] = useState(initialError ?? "");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Absolute URL, and it must be listed in Supabase's redirect
        // allow-list or the link silently returns to the site root.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Check <span className="font-medium text-foreground">{email}</span> for a
        sign-in link. It expires in an hour.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={status === "sending"}
      />

      <Button type="submit" disabled={status === "sending" || !email}>
        {status === "sending" ? "Sending…" : "Send me a link"}
      </Button>

      {status === "error" && (
        <p role="alert" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </form>
  );
}
