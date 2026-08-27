import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="num text-6xl font-semibold tracking-tight">404</p>
      <h1 className="text-lg font-medium">
        This ticker isn&rsquo;t in the universe
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Oreum tracks around 25 curated companies. Whatever you&rsquo;re looking
        for isn&rsquo;t one of them, or the page moved.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to Feed</Link>
      </Button>
    </div>
  );
}
