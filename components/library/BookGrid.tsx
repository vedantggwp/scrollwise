"use client";

import type { Book } from "@/lib/db";
import { BookCard } from "./BookCard";
import { cn } from "@/lib/utils/cn";

type BookGridProps = {
  books: Book[];
  onRetry?: (book: Book) => void;
  onRemove?: (book: Book) => void;
  /** "grid" = cover tiles (2–3 cols); "list" = vertical rows */
  layout?: "grid" | "list";
  className?: string;
};

export function BookGrid({
  books,
  onRetry,
  onRemove,
  layout = "list",
  className,
}: BookGridProps) {
  if (books.length === 0) return null;

  return (
    <ul
      className={cn(
        layout === "grid"
          ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          : "flex flex-col gap-3",
        className
      )}
      role="list"
    >
      {books.map((book) => (
        <li key={book.id}>
          <BookCard
            book={book}
            onRetry={onRetry}
            onRemove={onRemove}
            variant={layout === "grid" ? "grid" : "list"}
          />
        </li>
      ))}
    </ul>
  );
}
