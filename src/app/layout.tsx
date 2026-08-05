import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oreum",
  description: "Дешборд для відстеження акцій",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
