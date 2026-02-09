"use client";

import { useState, useCallback } from "react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** EPUB: cfi set. PDF: pageIndex set. */
export type SearchMatch = { cfi?: string; pageIndex?: number; excerpt: string };

type SearchDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<SearchMatch[]>;
  onSelectMatch: (match: SearchMatch) => void;
};

export function SearchDrawer({
  isOpen,
  onClose,
  onSearch,
  onSelectMatch,
}: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    try {
      const list = await onSearch(q);
      setResults(list);
    } finally {
      setLoading(false);
    }
  }, [query, onSearch]);

  const handleSelect = useCallback(
    (match: SearchMatch) => {
      onSelectMatch(match);
      onClose();
    },
    [onSelectMatch, onClose]
  );

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
        aria-label="Search in book"
      >
        <div className="flex shrink-0 flex-col gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Search
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <label htmlFor="reader-search-input" className="sr-only">
              Search in book
            </label>
            <input
              id="reader-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search in book…"
              className="min-h-[44px] flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              aria-describedby="search-results-status"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-50 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
              aria-label="Run search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2" id="search-results-status" aria-live="polite">
          {loading && (
            <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Searching…
            </p>
          )}
          {!loading && searched && results.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No results. Try a different word or phrase.
            </p>
          )}
          {!loading && results.length > 0 && (
            <ul className="space-y-1">
              {results.map((m, i) => (
                <li key={`${m.cfi ?? ""}-${m.pageIndex ?? ""}-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(m)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                      "min-h-[44px]"
                    )}
                  >
                    {m.pageIndex != null && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Page {m.pageIndex + 1}
                      </span>
                    )}
                    <span className="line-clamp-2 text-sm text-neutral-900 dark:text-neutral-100">
                      {m.excerpt || "(No excerpt)"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
