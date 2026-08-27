"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Only the button is a client component — the form and the page around it stay
 * server-rendered. Pending state genuinely is state, and there is no
 * server-only way to say "this is in flight".
 *
 * useFormStatus reads the status of the nearest enclosing form, so this has to
 * live inside it rather than wrap it.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending && (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      )}
      {pending ? pendingLabel : children}
    </Button>
  );
}
