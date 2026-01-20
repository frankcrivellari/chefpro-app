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
  title: "Recetui | Inventory Manager",
  description: "Verwaltung von Zukaufartikeln und Eigenproduktionen in Recetui",
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
            {/* <div className="mb-6 px-2">
              <img src="/recetui-header-frei.png" alt="Recetui" className="h-8 w-auto object-contain" />
            </div> */}
            <SidebarNav />
          </aside>
          <main className="flex min-h-screen flex-1 flex-col">
            <header className="flex h-16 items-center justify-between border-b bg-background px-6">
              <div className="flex items-center gap-4">
                <img src="/recetui-header-frei.png" alt="Recetui" className="h-8 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    MM
                  </div>
                  <span className="hidden sm:inline-block">Max Mustermann</span>
                </div>
              </div>
            </header>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
