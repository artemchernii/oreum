import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUser } from "@/lib/auth";
import { signOut } from "@/app/actions";

/**
 * The search input renders but does nothing — searching events needs an index
 * that does not exist until M4. Adding a ticker is a separate, working control
 * in the sidebar.
 */
export async function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
      <Link href="/" aria-label="Oreum, home">
        <Logo />
      </Link>

      <nav className="hidden items-center gap-1 text-sm sm:flex">
        <Link
          href="/"
          className="rounded-md px-2.5 py-1.5 text-foreground hover:bg-accent"
        >
          Feed
        </Link>
        <Link
          href="/ticker/AVGO"
          className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Ticker
        </Link>
      </nav>

      <div className="relative ml-auto hidden w-64 md:block">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search the universe"
          className="h-8 pl-8"
          aria-label="Search the universe"
        />
      </div>

      <div className="ml-auto flex items-center gap-3 md:ml-0">
        <MarketStatus />
        <UserMenu />
      </div>
    </header>
  );
}

/**
 * Initials plus a sign-out form. A dropdown would mean a Radix menu and a
 * client boundary for one action; account settings are Later anyway.
 */
async function UserMenu() {
  const user = await getUser();
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-7">
        <AvatarFallback className="num text-xs" title={user?.email ?? undefined}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <form action={signOut}>
        <button
          type="submit"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

/**
 * Monochrome by rule: a green "open" dot would spend colour budget that
 * belongs to price movement.
 */
function MarketStatus() {
  return (
    <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
      <span
        className="size-1.5 rounded-full bg-foreground"
        aria-hidden="true"
      />
      <span>Market open</span>
      <span className="num tabular-nums">15:42 ET</span>
    </div>
  );
}
