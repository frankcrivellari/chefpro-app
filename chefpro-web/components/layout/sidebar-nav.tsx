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
          "rounded-md px-3 py-2 text-left hover:bg-white/20 hover:text-white transition-colors",
          pathname.startsWith("/artikel") &&
            "bg-primary text-primary-foreground font-semibold shadow-sm"
        )}
      >
        Zutaten
      </Link>
      <Link
        href="/rezepte"
        className={cn(
          "rounded-md px-3 py-2 text-left hover:bg-white/20 hover:text-white transition-colors",
          pathname.startsWith("/rezepte") &&
            "bg-primary text-primary-foreground font-semibold shadow-sm"
        )}
      >
        Rezepte
      </Link>
      {/* <Link
        href="/lager"
        className={cn(
          "rounded-md px-3 py-2 text-left hover:bg-white/20 hover:text-white transition-colors",
          pathname.startsWith("/lager") &&
            "bg-primary text-primary-foreground font-semibold shadow-sm"
        )}
      >
        Lager
      </Link> */}
    </nav>
  );
}
