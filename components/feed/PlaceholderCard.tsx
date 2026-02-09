"use client";

import type { PlaceholderItem } from "@/lib/feed/placeholder-content";
import { Quote, Smile } from "lucide-react";

type PlaceholderCardProps = {
  item: PlaceholderItem;
};

export function PlaceholderCard({ item }: PlaceholderCardProps) {
  const Icon = item.type === "quote" ? Quote : Smile;
  const label = item.type === "quote" ? "Quote" : "Joke";

  return (
    <article
      className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-md shadow-neutral-200/50 transition-shadow hover:shadow-lg hover:shadow-neutral-300/50 dark:border-neutral-700/80 dark:bg-neutral-800/95 dark:shadow-neutral-950/30 dark:hover:shadow-neutral-900/40"
      data-placeholder-id={item.id}
    >
      <div className="flex gap-4 p-4">
        <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-700/80">
          <Icon className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {label}
          </p>
          <p className="mt-0.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {item.headline}
          </p>
        </div>
      </div>
      <div className="px-4 pb-4 pt-0">
        <p className="font-serif text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
          {item.body}
        </p>
      </div>
    </article>
  );
}
