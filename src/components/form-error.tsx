import { AlertCircle } from "lucide-react";

/**
 * Errors read as errors through weight, an icon and a border — never colour.
 * Red belongs to price movement and nothing else; once errors are red,
 * warnings go amber and the green in a price row stops meaning anything.
 */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-md border border-foreground/30 bg-muted/40 px-3 py-2 text-sm"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Supabase's raw messages leak implementation and often imply the user did
 * something wrong when they did not. Rate limiting in particular is a project
 * quota, not a mistake.
 */
export function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("rate limit")) {
    return "Too many sign-in emails were sent recently. The limit is a couple an hour on this project — wait a few minutes and try again.";
  }
  if (m.includes("invalid") && m.includes("expired")) {
    return "That link has already been used or has expired. Request a new one below.";
  }
  if (m.includes("missing its token")) {
    return "That link was incomplete. Request a new one below.";
  }
  if (m.includes("email") && m.includes("valid")) {
    return "That email address doesn't look right.";
  }
  return message;
}
