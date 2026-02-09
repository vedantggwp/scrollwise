"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";

export type LibraryCounts = {
  bookCount: number;
  readyCount: number;
  snippetCount: number;
  processingCount: number;
  errorCount: number;
};

export function useLibraryCounts(): LibraryCounts {
  const [counts, setCounts] = useState<LibraryCounts>({
    bookCount: 0,
    readyCount: 0,
    snippetCount: 0,
    processingCount: 0,
    errorCount: 0,
  });

  const load = useCallback(async (): Promise<LibraryCounts> => {
    const [bookCount, readyCount, snippetCount, processingCount, errorCount] = await Promise.all([
      db.books.count(),
      db.books.where("processingStatus").equals("ready").count(),
      db.snippets.count(),
      db.books
        .where("processingStatus")
        .anyOf(["pending", "extracting", "scoring"])
        .count(),
      db.books.where("processingStatus").equals("error").count(),
    ]);
    return {
      bookCount,
      readyCount,
      snippetCount,
      processingCount,
      errorCount,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      load()
        .then((next) => {
          if (!cancelled) setCounts(next);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Refresh counts when window gains focus (e.g. user returns from Library after adding a book)
  useEffect(() => {
    const onFocus = () => {
      load().then(setCounts).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return counts;
}
