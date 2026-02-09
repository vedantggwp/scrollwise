"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { RotateCcw, Trash2, MoreVertical, BookOpen } from "lucide-react";
import type { Book } from "@/lib/db";
import { cn } from "@/lib/utils/cn";
import { ProcessingIndicator } from "./ProcessingIndicator";

type BookCardProps = {
  book: Book;
  onRetry?: (book: Book) => void;
  onRemove?: (book: Book) => void;
  /** "grid" = cover tile + overflow menu (for ready books); "list" = row with inline actions */
  variant?: "grid" | "list";
  className?: string;
};

function ActionButtons({
  book,
  onRetry,
  onRemove,
  variant = "default",
}: {
  book: Book;
  onRetry?: (book: Book) => void;
  onRemove?: (book: Book) => void;
  variant?: "default" | "error";
}) {
  if (!onRetry && !onRemove) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onRetry && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRetry(book);
          }}
          className={cn(
            "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors",
            variant === "error"
              ? "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
          )}
          aria-label={variant === "error" ? "Retry extraction" : "Re-extract (refresh snippets)"}
          title={variant === "error" ? "Retry extraction" : "Re-extract"}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(book);
          }}
          className={cn(
            "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors",
            variant === "error"
              ? "border border-neutral-200 bg-white text-red-600 hover:bg-red-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-red-400 dark:hover:bg-red-950/30"
              : "text-neutral-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          )}
          aria-label="Remove book"
          title="Remove"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

const MENU_GAP = 4;
const MENU_MIN_WIDTH = 160; // 10rem
const MENU_EST_HEIGHT = 132; // ~3 items so we can decide placement before measuring

function BookCardGrid({
  book,
  onRetry,
  onRemove,
  className,
}: {
  book: Book;
  onRetry?: (book: Book) => void;
  onRemove?: (book: Book) => void;
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<"below" | "above">("below");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    const el = triggerRef.current;
    if (el && typeof window !== "undefined") {
      const rect = el.getBoundingClientRect();
      setAnchorRect(rect);
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove =
        spaceBelow < MENU_EST_HEIGHT + MENU_GAP && rect.top >= MENU_EST_HEIGHT + MENU_GAP;
      setMenuPlacement(placeAbove ? "above" : "below");
      setMenuOpen(true);
    }
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setAnchorRect(null);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const handleScrollOrResize = () => closeMenu();
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [menuOpen]);

  const coverBlock = (
    <div className="aspect-[2/3] w-full overflow-hidden rounded-t-xl bg-neutral-200 dark:bg-neutral-700">
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-lg font-medium text-neutral-500 dark:text-neutral-400"
          aria-hidden
        >
          {book.title.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );

  const menuContent =
    menuOpen &&
    anchorRect &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[9999] min-w-[10rem] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800"
        aria-label="Book options"
        style={{
          left: Math.max(
            MENU_GAP,
            Math.min(anchorRect.right - MENU_MIN_WIDTH, window.innerWidth - MENU_MIN_WIDTH - MENU_GAP)
          ),
          top:
            menuPlacement === "below"
              ? anchorRect.bottom + MENU_GAP
              : undefined,
          bottom:
            menuPlacement === "above"
              ? window.innerHeight - anchorRect.top + MENU_GAP
              : undefined,
        }}
      >
        <Link
          href={`/reader/${book.id}`}
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
          onClick={() => closeMenu()}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          Open
        </Link>
        {onRetry && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
            onClick={(e) => {
              e.preventDefault();
              onRetry(book);
              closeMenu();
            }}
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            Re-extract
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={(e) => {
              e.preventDefault();
              onRemove(book);
              closeMenu();
            }}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Remove
          </button>
        )}
      </div>,
      document.body
    );

  return (
    <>
      <article
        className={cn(
          "relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800",
          className
        )}
      >
        <Link
          href={`/reader/${book.id}`}
          className="block transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 dark:focus:ring-neutral-500 dark:focus:ring-offset-neutral-900 rounded-xl"
          aria-label={`Open ${book.title} by ${book.author}`}
        >
          {coverBlock}
          <div className="p-2">
            <h3 className="line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">
              {book.title}
            </h3>
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{book.author}</p>
          </div>
        </Link>
        <div className="absolute right-1 top-1 z-10">
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (menuOpen) closeMenu();
              else openMenu();
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-black/40 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/80"
            aria-label="Book options"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </article>
      {menuContent}
    </>
  );
}

export function BookCard({
  book,
  onRetry,
  onRemove,
  variant = "list",
  className,
}: BookCardProps) {
  if (variant === "grid") {
    return (
      <BookCardGrid
        book={book}
        onRetry={onRetry}
        onRemove={onRemove}
        className={className}
      />
    );
  }

  const href = book.processingStatus === "ready" ? `/reader/${book.id}` : "#";
  const isProcessing =
    book.processingStatus === "pending" ||
    book.processingStatus === "extracting" ||
    book.processingStatus === "scoring";
  const isError = book.processingStatus === "error";

  const coverBlock = (
    <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-700">
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500 dark:text-neutral-400"
          aria-hidden
        >
          {book.title.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );

  const titleBlock = (
    <div className="min-w-0 flex-1">
      <h3 className="truncate font-medium text-neutral-900 dark:text-neutral-100">
        {book.title}
      </h3>
      <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{book.author}</p>
      {isProcessing ? (
        <ProcessingIndicator
          status={book.processingStatus}
          progress={book.processingProgress}
          className="mt-2"
        />
      ) : isError ? (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Error · Retry or remove</p>
      ) : (
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          {book.format.toUpperCase()} · Open
        </p>
      )}
    </div>
  );

  const cardClass = cn(
    "flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800",
    isProcessing && "opacity-90",
    className
  );

  if (isError) {
    return (
      <div className={cardClass}>
        {coverBlock}
        {titleBlock}
        <ActionButtons book={book} onRetry={onRetry} onRemove={onRemove} variant="error" />
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className={cn(cardClass, "pointer-events-none")}>
        {coverBlock}
        {titleBlock}
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <Link
        href={href}
        className="flex min-w-0 flex-1 gap-3 transition-shadow hover:opacity-95"
        aria-label={`Open ${book.title} by ${book.author}`}
      >
        {coverBlock}
        {titleBlock}
      </Link>
      <ActionButtons book={book} onRetry={onRetry} onRemove={onRemove} />
    </div>
  );
}
