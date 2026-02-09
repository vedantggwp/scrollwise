"use client";

import { useState, useEffect, useCallback } from "react";
import { getDiscoverySnippets } from "@/lib/feed/discovery";
import type { Snippet } from "@/lib/db";
import type { Book } from "@/lib/db";
import { db } from "@/lib/db";

const PAGE_SIZE = 20;

export function useInfiniteSnippets(initialScrollIndex?: number) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [books, setBooks] = useState<Map<string, Book>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const initialCount = Math.max(PAGE_SIZE, (initialScrollIndex ?? 0) + 1);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getDiscoverySnippets(snippets.length + PAGE_SIZE);
      const bookIds = [...new Set(next.map((s) => s.bookId))];
      const bookList = await db.books.bulkGet(bookIds);
      const bookMap = new Map(books);
      bookList.forEach((b) => b && bookMap.set(b.id, b));
      setBooks(new Map(bookMap));
      setSnippets(next);
      setHasMore(next.length >= snippets.length + PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [hasMore, snippets.length, books]);

  const removeSnippet = useCallback((snippetId: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== snippetId));
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getDiscoverySnippets(initialCount);
      const bookIds = [...new Set(next.map((s) => s.bookId))];
      const bookList = await db.books.bulkGet(bookIds);
      const bookMap = new Map<string, Book>();
      bookList.forEach((b) => b && bookMap.set(b.id, b));
      setBooks(bookMap);
      setSnippets(next);
      setHasMore(next.length >= initialCount);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [initialCount]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDiscoverySnippets(initialCount)
      .then(async (initial) => {
        if (cancelled) return;
        const bookIds = [...new Set(initial.map((s) => s.bookId))];
        const bookList = await db.books.bulkGet(bookIds);
        const bookMap = new Map<string, Book>();
        bookList.forEach((b) => b && bookMap.set(b.id, b));
        setBooks(bookMap);
        setSnippets(initial);
        setHasMore(initial.length >= initialCount);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: use mount-time scroll index only for initial load
  }, []);

  return { snippets, books, loading, hasMore, error, loadMore, removeSnippet, refetch };
}
