"use client";

import { X } from "lucide-react";
import type { TocEntry } from "./EpubRenderer";
import { cn } from "@/lib/utils/cn";

type TocDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  toc: TocEntry[];
  onSelect: (href: string) => void;
  /** e.g. "No table of contents" for PDF or empty book */
  emptyMessage?: string;
};

function TocItem({
  entry,
  onSelect,
  onClose,
  depth = 0,
}: {
  entry: TocEntry;
  onSelect: (href: string) => void;
  onClose: () => void;
  depth?: number;
}) {
  const hasChildren = entry.subitems?.length > 0;
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={() => {
          if (entry.href) {
            onSelect(entry.href);
            onClose();
          }
        }}
        className={cn(
          "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          "min-h-[44px] min-w-[44px]"
        )}
        style={{ paddingLeft: 12 + depth * 12 }}
        aria-label={entry.label}
      >
        <span className="min-w-0 flex-1 truncate text-neutral-900 dark:text-neutral-100">
          {entry.label}
        </span>
      </button>
      {hasChildren && (
        <ul className="border-l border-neutral-200 pl-1 dark:border-neutral-700" aria-label="Subchapters">
          {entry.subitems.map((sub, i) => (
            <TocItem
              key={sub.href + String(i)}
              entry={sub}
              onSelect={onSelect}
              onClose={onClose}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TocDrawer({
  isOpen,
  onClose,
  toc,
  onSelect,
  emptyMessage = "No table of contents",
}: TocDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/30"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed left-0 top-0 z-40 flex h-full w-full max-w-sm flex-col border-r border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-md"
        aria-label="Table of contents"
      >
        <div className="flex shrink-0 flex-col gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Contents
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label="Close table of contents"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-auto p-2">
          {toc.length === 0 ? (
            <li className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {emptyMessage}
            </li>
          ) : (
            toc.map((entry, i) => (
              <TocItem
                key={entry.href + String(i)}
                entry={entry}
                onSelect={onSelect}
                onClose={onClose}
              />
            ))
          )}
        </ul>
      </aside>
    </>
  );
}
