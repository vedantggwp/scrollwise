/**
 * Orchestrates extraction + scoring for one book. Runs on main thread with progress.
 */

import { db } from "@/lib/db";
import { extractChunksFromEpub } from "./epub-extractor";
import { scoreChunk, rawChunkToSnippet } from "./heuristic-scorer";
import type { RawChunk } from "./types";
import type { Snippet } from "@/lib/db";

const MIN_SCORE = 0.15;
const MAX_SNIPPETS_PER_BOOK = 200;

export type ExtractionProgress = {
  phase: "extracting" | "scoring" | "done";
  sectionIndex?: number;
  totalSections?: number;
  snippetsCount?: number;
};

export async function runEpubExtraction(
  bookId: string,
  blob: Blob,
  onProgress: (progress: number, phase: ExtractionProgress) => void
): Promise<void> {
  const created = Date.now();

  onProgress(0, { phase: "extracting" });
  const rawChunks = await extractChunksFromEpub(blob, (sectionIndex, total) => {
    onProgress((sectionIndex / total) * 50, {
      phase: "extracting",
      sectionIndex,
      totalSections: total,
    });
  });

  onProgress(50, { phase: "scoring" });
  const scoredAll: { chunk: RawChunk; score: number; factors: ReturnType<typeof scoreChunk>["factors"] }[] = [];
  let firstInBook = true;
  let indexInSection = 0;
  let lastSection = -1;
  for (const chunk of rawChunks) {
    if (chunk.sectionIndex !== lastSection) {
      lastSection = chunk.sectionIndex;
      indexInSection = 0;
    }
    const { score, factors } = scoreChunk(chunk, indexInSection, firstInBook);
    firstInBook = false;
    indexInSection++;
    scoredAll.push({ chunk, score, factors });
  }

  scoredAll.sort((a, b) => b.score - a.score);
  const scored = scoredAll.filter((s) => s.score >= MIN_SCORE);

  const bySection = new Map<number, boolean>();
  let selected: typeof scoredAll = [];
  for (const item of scored) {
    if (selected.length >= MAX_SNIPPETS_PER_BOOK) break;
    selected.push(item);
    bySection.set(item.chunk.sectionIndex, true);
  }
  for (const item of scored) {
    if (selected.length >= MAX_SNIPPETS_PER_BOOK) break;
    if (!bySection.get(item.chunk.sectionIndex)) {
      selected.push(item);
      bySection.set(item.chunk.sectionIndex, true);
    }
  }
  if (selected.length === 0 && scoredAll.length > 0) {
    selected = scoredAll.slice(0, Math.min(MAX_SNIPPETS_PER_BOOK, scoredAll.length));
  }
  const snippets: Snippet[] = selected.map(({ chunk, score, factors }) =>
    rawChunkToSnippet(chunk, bookId, Math.max(score, MIN_SCORE), factors, created) as Snippet
  );

  onProgress(90, { phase: "scoring", snippetsCount: snippets.length });

  await db.snippets.bulkAdd(snippets);
  await db.books.update(bookId, {
    processingStatus: "ready",
    processingProgress: 100,
    totalSections: rawChunks.length ? Math.max(...rawChunks.map((c) => c.sectionIndex)) + 1 : 0,
    updatedAt: Date.now(),
  });

  onProgress(100, { phase: "done", snippetsCount: snippets.length });
}
