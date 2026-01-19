 "use client";
import type { Metadata } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChefPro | Inventory Manager",
  description: "Verwaltung von Zukaufartikeln und Eigenproduktionen in ChefPro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen bg-gradient-to-b from-background to-muted">
          <aside className="hidden w-52 flex-col border-r bg-background/90 px-4 py-6 text-sm text-foreground md:flex">
            <div className="mb-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ChefPro
            </div>
            <nav className="flex flex-col gap-1">
              <Link
                href="/artikel"
                className={cn(
                  "rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground",
                  pathname.startsWith("/artikel") && "bg-primary text-primary-foreground font-semibold"
                )}
              >
                Zutaten
              </Link>
              <Link
                href="/rezepte"
                className={cn(
                  "rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground",
                  pathname.startsWith("/rezepte") && "bg-primary text-primary-foreground font-semibold"
                )}
              >
                Rezepte
              </Link>
            </nav>
          </aside>
          <main className="flex min-h-screen flex-1 flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
