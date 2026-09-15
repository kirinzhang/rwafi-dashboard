"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "美股代币", en: "Equities" },
  { href: "/stablecoins", label: "稳定币", en: "Stables" },
  { href: "/launchpads", label: "发射台", en: "Launchpads" },
  { href: "/rh-lp", label: "RH LP", en: "Stock LP" },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-white/8 bg-black/30">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-start gap-1 px-4 py-2 sm:px-6 lg:px-8">
        {LINKS.map((link) => {
          const active = isActive(link.href, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-white/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {link.label}
              <span className="ml-1.5 hidden text-[11px] text-muted-foreground/80 sm:inline">
                {link.en}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
