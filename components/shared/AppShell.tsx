"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { StorageTip } from "./StorageTip";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/reader/");
  const isFeed2 = pathname?.startsWith("/feed2");
  const isStandalone = isReader || isFeed2;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {!isStandalone && <StorageTip />}
      <main className={isStandalone ? "" : "pb-20"}>{children}</main>
      {!isStandalone && <BottomNav />}
    </div>
  );
}
