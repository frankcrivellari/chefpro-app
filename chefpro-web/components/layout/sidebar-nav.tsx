 "use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      <Link
        href="/artikel"
        className={cn(
          "rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground",
          pathname.startsWith("/artikel") &&
            "bg-primary text-primary-foreground font-semibold"
        )}
      >
        Zutaten-Datenbank
      </Link>
    </nav>
  );
}
