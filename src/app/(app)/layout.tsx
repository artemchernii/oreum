import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

/**
 * The shell wraps the signed-in app only. `/login` sits outside this group so
 * it does not render a top bar and a watchlist sidebar to someone who has
 * neither.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
