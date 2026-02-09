/**
 * Discovery mode: doomscroll with score + variety + serendipity.
 */

import { db } from "@/lib/db";
import type { Snippet } from "@/lib/db";

const MAX_CONSECUTIVE_SAME_BOOK = 2;
const DEFAULT_SERENDIPITY = 0.3;
const NEW_USER_BOOK_THRESHOLD = 3;

export async function getDiscoverySnippets(
  limit: number,
  options?: {
    serendipityFactor?: number;
    boostFirstCards?: boolean;
    excludedBookIds?: string[];
  }
): Promise<Snippet[]> {
  const serendipity = options?.serendipityFactor ?? DEFAULT_SERENDIPITY;
  const excluded = new Set(options?.excludedBookIds ?? []);

  const readyBooks = await db.books.where("processingStatus").equals("ready").toArray();
  const bookCount = readyBooks.length;
  const boostFirst = options?.boostFirstCards !== false && bookCount < NEW_USER_BOOK_THRESHOLD;
  const validBookIds = new Set(readyBooks.map((b) => b.id));
  const bookAddedAt = new Map(readyBooks.map((b) => [b.id, b.addedAt]));

  let snippets: Snippet[];
  if (excluded.size > 0) {
    snippets = await db.snippets
      .where("bookId")
      .noneOf([...excluded])
      .and((s) => s.heuristicScore >= 0.15)
      .toArray();
  } else {
    snippets = await db.snippets
      .filter((s) => s.heuristicScore >= 0.15)
      .toArray();
  }
  snippets = snippets.filter((s) => validBookIds.has(s.bookId));

  const now = Date.now();
  const oneDay = 86400000;
  const scored = snippets.map((s) => {
    let feedScore = s.heuristicScore;
    if (s.lastShownAt == null) feedScore += 0.2;
    else feedScore -= Math.min(0.4, (s.impressionCount || 0) * 0.05);
    const addedAt = bookAddedAt.get(s.bookId) ?? now;
    const freshness = Math.max(0, 1 - (now - addedAt) / (30 * oneDay));
    feedScore += 0.1 * freshness;
    if (s.interactionType === "dismissed") feedScore -= 0.15;
    const noise = (Math.random() - 0.5) * 2 * serendipity;
    return { snippet: s, feedScore: feedScore + noise };
  });

  scored.sort((a, b) => b.feedScore - a.feedScore);

  if (boostFirst) {
    const top = scored.slice(0, 5).sort((a, b) => b.snippet.heuristicScore - a.snippet.heuristicScore);
    const rest = scored.filter((s) => !top.includes(s));
    scored.length = 0;
    scored.push(...top, ...rest);
  }

  const result: Snippet[] = [];
  let sameBookCount = 0;
  let lastBookId = "";
  for (const { snippet } of scored) {
    if (result.length >= limit) break;
    if (snippet.bookId === lastBookId) {
      sameBookCount++;
      if (sameBookCount >= MAX_CONSECUTIVE_SAME_BOOK) continue;
    } else {
      lastBookId = snippet.bookId;
      sameBookCount = 1;
    }
    result.push(snippet);
  }

  return result;
}
