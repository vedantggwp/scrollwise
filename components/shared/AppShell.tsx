"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { StorageTip } from "./StorageTip";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/reader/");

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {!isReader && <StorageTip />}
      <main className={isReader ? "" : "pb-20"}>{children}</main>
      {!isReader && <BottomNav />}
    </div>
  );
}
