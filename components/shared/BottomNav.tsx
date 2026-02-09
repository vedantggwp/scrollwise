"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/feed", label: "Feed", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] pt-2 dark:border-neutral-800 dark:bg-neutral-950/95"
      aria-label="Main navigation"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/feed" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-neutral-600 transition-colors dark:text-neutral-400",
              active
                ? "text-blue-600 dark:text-blue-400"
                : "hover:text-neutral-900 dark:hover:text-neutral-200"
            )}
            aria-current={active ? "page" : undefined}
            aria-label={label}
          >
            <Icon className="h-6 w-6" aria-hidden />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
