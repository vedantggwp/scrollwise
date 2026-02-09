"use client";

import { useEffect, useState } from "react";
import { Highlighter, StickyNote, Bookmark, X } from "lucide-react";
import { db } from "@/lib/db";
import type { Annotation } from "@/lib/db";
import { cn } from "@/lib/utils/cn";

type AnnotationSidebarProps = {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  /** EPUB: jump to CFI. Called when user selects an annotation that has no pageIndex. */
  onSelectCfi: (cfi: string) => void;
  /** PDF: jump to page. Called when user selects an annotation that has pageIndex. */
  onSelectPdfPage?: (pageIndex: number) => void;
  /** Called with CFI ranges (EPUB) so the reader can remove visuals before DB clear. PDF: pass []. */
  onClearAll?: (highlightCfiRanges: string[]) => void;
  /** Called after DB is cleared; use to remount reader so it shows no highlights immediately. */
  onAfterClearAll?: () => void;
};

const TYPE_ICON = {
  highlight: Highlighter,
  note: StickyNote,
  bookmark: Bookmark,
};

export function AnnotationSidebar({
  bookId,
  isOpen,
  onClose,
  onSelectCfi,
  onSelectPdfPage,
  onClearAll,
  onAfterClearAll,
}: AnnotationSidebarProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    if (!isOpen || !bookId) return;
    let cancelled = false;
    db.annotations
      .where("bookId")
      .equals(bookId)
      .sortBy("createdAt")
      .then((list) => {
        if (!cancelled) setAnnotations([...list].reverse());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookId, isOpen]);

  const handleClearAll = async () => {
    if (typeof window !== "undefined" && !window.confirm("Remove all highlights, notes, and bookmarks in this book?")) return;
    const allForBook = await db.annotations.where("bookId").equals(bookId).toArray();
    if (allForBook.length === 0) return;
    const highlightCfiRanges = allForBook
      .filter((a) => (a.type === "highlight" || a.type === "note") && a.pageIndex == null)
      .map((a) => a.cfiRange)
      .filter((cfi): cfi is string => cfi != null && cfi.length > 0);
    onClearAll?.(highlightCfiRanges);
    await db.annotations.where("bookId").equals(bookId).delete();
    setAnnotations([]);
    onAfterClearAll?.();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/30"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-sm flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-md"
        aria-label="Annotations"
      >
        <div className="flex shrink-0 flex-col gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Annotations
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label="Close annotations"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {annotations.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="self-start text-xs text-neutral-500 underline hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
              aria-label="Clear all annotations"
            >
              Clear all
            </button>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-auto p-2">
          {annotations.length === 0 ? (
            <li className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No highlights, notes, or bookmarks yet. Select text in the book to add one.
            </li>
          ) : (
            annotations.map((a) => {
              const Icon = TYPE_ICON[a.type];
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (a.pageIndex != null && onSelectPdfPage) {
                        onSelectPdfPage(a.pageIndex);
                      } else {
                        onSelectCfi(a.cfiRange);
                      }
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">
                        {a.text || "(No text)"}
                      </span>
                      {a.noteBody && (
                        <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {a.noteBody}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-neutral-400 dark:text-neutral-500">
                        {a.type}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>
    </>
  );
}
