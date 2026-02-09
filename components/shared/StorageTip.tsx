"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getStorageTier } from "@/lib/utils/file-storage";
import { useAppStore } from "@/stores/app-store";

export function StorageTip() {
  const [tier, setTier] = useState<"opfs" | "idb" | null>(null);
  const dismissed = useAppStore((s) => s.storageTipDismissed);
  const setDismissed = useAppStore((s) => s.setStorageTipDismissed);

  useEffect(() => {
    getStorageTier().then(setTier);
  }, []);

  if (tier !== "idb" || dismissed) return null;

  return (
    <div
      className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30"
      role="status"
    >
      <p className="flex-1 text-amber-800 dark:text-amber-200">
        For best performance, use Chrome or Edge.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-900"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
