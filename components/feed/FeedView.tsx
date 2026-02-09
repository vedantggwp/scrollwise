"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useInfiniteSnippets } from "@/hooks/useInfiniteSnippets";
import { useLibraryCounts } from "@/hooks/useLibraryCounts";
import { useSavedTodayCount } from "@/hooks/useSavedTodayCount";
import { useFeedStore } from "@/stores/feed-store";
import { getPlaceholderItems } from "@/lib/feed/placeholder-content";
import type { PlaceholderItem } from "@/lib/feed/placeholder-content";
import type { Snippet } from "@/lib/db";
import type { Book } from "@/lib/db";
import { SnippetCard } from "./SnippetCard";
import { SnippetCardSkeleton } from "./SnippetCardSkeleton";
import { PlaceholderCard } from "./PlaceholderCard";

const INITIAL_PLACEHOLDER_COUNT = 50;
const LOAD_MORE_PLACEHOLDER_COUNT = 25;
const SKELETON_COUNT = 12;

type FeedRow =
  | { type: "snippet"; snippet: Snippet; book: Book | undefined }
  | { type: "placeholder"; item: PlaceholderItem }
  | { type: "skeleton" };

export function FeedView() {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const firstVisibleItemIndex = useFeedStore((s) => s.firstVisibleItemIndex);
  const { snippets, books, loading, hasMore, loadMore, removeSnippet, refetch } =
    useInfiniteSnippets(firstVisibleItemIndex);
  const setFirstVisibleItemIndex = useFeedStore((s) => s.setFirstVisibleItemIndex);
  const counts = useLibraryCounts();
  const savedTodayCount = useSavedTodayCount();
  const [refreshing, setRefreshing] = useState(false);
  const [placeholderCount, setPlaceholderCount] = useState(INITIAL_PLACEHOLDER_COUNT);
  const hasRetriedEmptyRef = useRef(false);
  const hadSnippetsRef = useRef(false);

  const placeholderItems = useMemo(
    () => getPlaceholderItems(placeholderCount),
    [placeholderCount]
  );

  useEffect(() => {
    const handler = () => {
      setRefreshing(true);
      refetch().finally(() => setRefreshing(false));
    };
    window.addEventListener("scrollwise-book-ready", handler);
    return () => window.removeEventListener("scrollwise-book-ready", handler);
  }, [refetch]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  useEffect(() => {
    if (
      !loading &&
      snippets.length === 0 &&
      counts.readyCount > 0 &&
      !hasRetriedEmptyRef.current
    ) {
      hasRetriedEmptyRef.current = true;
      refetch();
    }
  }, [loading, snippets.length, counts.readyCount, refetch]);

  // When real snippets appear (e.g. after upload), start at top so user sees their content
  useEffect(() => {
    if (snippets.length > 0 && !hadSnippetsRef.current) {
      hadSnippetsRef.current = true;
      virtuosoRef.current?.scrollToIndex({ index: 0, behavior: "auto" });
    }
    if (snippets.length === 0) hadSnippetsRef.current = false;
  }, [snippets.length]);

  // Placeholders only when there are no real snippets (per design: disappear once books are uploaded)
  const feedRows: FeedRow[] = useMemo(() => {
    if (loading && snippets.length === 0) {
      return Array.from({ length: SKELETON_COUNT }, (): FeedRow => ({ type: "skeleton" }));
    }
    const snippetRows: FeedRow[] = snippets.map((snippet) => ({
      type: "snippet" as const,
      snippet,
      book: books.get(snippet.bookId),
    }));
    if (snippets.length > 0) {
      return snippetRows;
    }
    const placeholderRows: FeedRow[] = placeholderItems.map((item) => ({
      type: "placeholder" as const,
      item,
    }));
    return placeholderRows;
  }, [loading, snippets, books, placeholderItems]);

  const handleAtBottom = useCallback(() => {
    if (loading) return;
    if (hasMore) {
      loadMore();
    } else if (snippets.length === 0) {
      setPlaceholderCount((c) => c + LOAD_MORE_PLACEHOLDER_COUNT);
    }
  }, [loading, hasMore, loadMore, snippets.length]);

  const renderItem = useCallback(
    (index: number, row: FeedRow) => {
      if (row.type === "skeleton") {
        return (
          <div className="pb-3">
            <SnippetCardSkeleton />
          </div>
        );
      }
      if (row.type === "placeholder") {
        return (
          <div className="pb-3">
            <PlaceholderCard item={row.item} />
          </div>
        );
      }
      return (
        <div className="pb-3">
          <SnippetCard
            snippet={row.snippet}
            book={row.book}
            index={index}
            onSkip={removeSnippet}
          />
        </div>
      );
    },
    [removeSnippet]
  );

  const showEmptyHint = !loading && snippets.length === 0 && counts.bookCount === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Feed
          </h1>
          {savedTodayCount > 0 && (
            <span
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              aria-label={`${savedTodayCount} saved today`}
            >
              {savedTodayCount} saved today
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            refetch().finally(() => setRefreshing(false));
          }}
          disabled={loading || refreshing}
          className="min-h-[44px] rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          aria-label="Refresh feed"
        >
          {refreshing ? "…" : "Refresh"}
        </button>
      </header>
      {showEmptyHint && (
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          <Link
            href="/library"
            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Add books in Library
          </Link>{" "}
          to see your highlights here.
        </p>
      )}
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: "calc(100vh - 12rem)" }}
        data={feedRows}
        initialTopMostItemIndex={0}
        atBottomThreshold={300}
        atBottomStateChange={(atBottom) => {
          if (atBottom) handleAtBottom();
        }}
        followOutput={false}
        itemContent={renderItem}
        rangeChanged={(range) => {
          if (range.startIndex >= 0 && snippets.length > 0)
            setFirstVisibleItemIndex(range.startIndex);
        }}
      />
    </div>
  );
}
