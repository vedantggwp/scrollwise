"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Highlighter, BookOpen, SkipForward } from "lucide-react";
import { db } from "@/lib/db";
import type { Snippet } from "@/lib/db";
import type { Book } from "@/lib/db";
import { useFeedStore } from "@/stores/feed-store";
import { cn } from "@/lib/utils/cn";
import { formatHeadlineAndBody } from "@/lib/utils/snippet-text";

type SnippetCardProps = {
  snippet: Snippet;
  book: Book | undefined;
  index: number;
  onSkip?: (snippetId: string) => void;
};

export function SnippetCard({ snippet, book, onSkip }: SnippetCardProps) {
  const setLastTappedCardId = useFeedStore((s) => s.setLastTappedCardId);
  const readerUrl = `/reader/${snippet.bookId}?loc=${encodeURIComponent(snippet.location)}`;

  const handleSave = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
    db.snippets.update(snippet.id, {
      interactionType: "saved",
      savedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, [snippet.id]);

  const handleHighlight = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
    db.snippets.update(snippet.id, {
      interactionType: "saved",
      savedAt: Date.now(),
      updatedAt: Date.now(),
    });
    setLastTappedCardId(snippet.id);
    window.location.href = readerUrl;
  }, [snippet.id, readerUrl, setLastTappedCardId]);

  const handleSkip = useCallback(() => {
    db.snippets.update(snippet.id, {
      interactionType: "dismissed",
      updatedAt: Date.now(),
    });
    onSkip?.(snippet.id);
  }, [snippet.id, onSkip]);

  const handleRead = useCallback(() => {
    setLastTappedCardId(snippet.id);
  }, [setLastTappedCardId, snippet.id]);

  useEffect(() => {
    db.snippets.update(snippet.id, {
      impressionCount: snippet.impressionCount + 1,
      lastShownAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, [snippet.id, snippet.impressionCount]);

  if (!book) return null;

  const { headline: cardHeadline, body: cardBody } = formatHeadlineAndBody(snippet.rawText);
  const displayHeadline = snippet.aiHeadline ?? cardHeadline;
  const displayBody =
    cardBody.length > 200 ? `${cardBody.slice(0, 200).trim()}…` : cardBody;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-md shadow-neutral-200/50 transition-shadow hover:shadow-lg hover:shadow-neutral-300/50 dark:border-neutral-700/80 dark:bg-neutral-800/95 dark:shadow-neutral-950/30 dark:hover:shadow-neutral-900/40"
      data-snippet-id={snippet.id}
    >
      <div className="flex gap-4 p-4">
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 shadow-inner dark:bg-neutral-700/80">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-400 dark:text-neutral-500">
              {book.title.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {book.title}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {book.author}
          </p>
        </div>
      </div>
      <Link
        href={readerUrl}
        onClick={handleRead}
        className="block px-4 pb-3 pt-0"
        aria-label={`Read snippet from ${book.title}`}
      >
        <h3 className="font-serif text-lg font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
          {displayHeadline}
        </h3>
        {displayBody ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {displayBody}
          </p>
        ) : null}
        <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
          Section {snippet.sectionIndex + 1}
        </p>
      </Link>
      <div className="flex items-center justify-end gap-0 border-t border-neutral-100 bg-neutral-50/80 px-2 py-2 dark:border-neutral-700/80 dark:bg-neutral-800/50">
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors",
            snippet.interactionType === "saved"
              ? "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              : "text-neutral-500 hover:bg-neutral-200/80 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
          )}
          aria-label={snippet.interactionType === "saved" ? "Saved" : "Save snippet"}
        >
          <Bookmark
            className={cn("h-5 w-5", snippet.interactionType === "saved" && "fill-current")}
          />
        </button>
        <button
          type="button"
          onClick={handleHighlight}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
          aria-label="Highlight and open"
        >
          <Highlighter className="h-5 w-5" />
        </button>
        <Link
          href={readerUrl}
          onClick={handleRead}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
          aria-label="Open in reader"
        >
          <BookOpen className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={handleSkip}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
          aria-label="Skip"
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
