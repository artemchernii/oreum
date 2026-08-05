import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oreum",
  description: "Дешборд для відстеження акцій",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {/* Навмисно голий. Сайдбар і сітка — M1. */}
        <header className="flex h-14 items-center px-4">
          <Logo />
        </header>
        {children}
      </body>
    </html>
  );
}
