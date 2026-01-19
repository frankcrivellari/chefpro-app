import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarNav } from "@/components/layout/sidebar-nav";
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
            <SidebarNav />
          </aside>
          <main className="flex min-h-screen flex-1 flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
