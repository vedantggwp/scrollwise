"use client";

import { Highlighter, StickyNote, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SelectionToolbarProps = {
  onHighlight: () => void;
  onNote: () => void;
  onBookmark: () => void;
  onRemoveHighlight?: () => void;
  onRemoveBookmark?: () => void;
  hasHighlight?: boolean;
  hasBookmark?: boolean;
  className?: string;
};

export function SelectionToolbar({
  onHighlight,
  onNote,
  onBookmark,
  onRemoveHighlight,
  onRemoveBookmark,
  hasHighlight,
  hasBookmark,
  className,
}: SelectionToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Selection actions"
      className={cn(
        "flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800",
        className
      )}
    >
      {hasHighlight && onRemoveHighlight ? (
        <button
          type="button"
          onClick={onRemoveHighlight}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
          aria-label="Remove highlight"
        >
          <Highlighter className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onHighlight}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          aria-label="Highlight"
        >
          <Highlighter className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        onClick={onNote}
        disabled={hasHighlight}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
        aria-label="Add note"
      >
        <StickyNote className="h-5 w-5" />
      </button>
      {hasBookmark && onRemoveBookmark ? (
        <button
          type="button"
          onClick={onRemoveBookmark}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
          aria-label="Remove bookmark"
        >
          <BookmarkCheck className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onBookmark}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          aria-label="Bookmark"
        >
          <Bookmark className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
