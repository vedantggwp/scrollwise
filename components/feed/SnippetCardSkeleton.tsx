"use client";

import { cn } from "@/lib/utils/cn";

export function SnippetCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-md dark:border-neutral-700/80 dark:bg-neutral-800/95",
        className
      )}
    >
      <div className="flex gap-4 p-4">
        <div className="h-20 w-14 shrink-0 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
      <div className="space-y-2 px-4 pb-4 pt-0">
        <div className="h-5 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-1/6 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="flex gap-2 border-t border-neutral-100 bg-neutral-50/80 px-2 py-2 dark:border-neutral-700/80 dark:bg-neutral-800/50">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700"
          />
        ))}
      </div>
    </div>
  );
}
