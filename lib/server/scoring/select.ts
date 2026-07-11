import type { BookChunk } from "../ingestion/types";
import { scoreChunk } from "./score";

interface ScoredChunk {
  chunk: BookChunk;
  score: number;
  inputIndex: number;
}

function lexicalCompare(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function chapterKey(chunk: BookChunk): string {
  return `${chunk.bookRef}\u0000${chunk.chapterIndex}`;
}

function compareChunks(left: ScoredChunk, right: ScoredChunk): number {
  return right.score - left.score
    || lexicalCompare(left.chunk.bookRef, right.chunk.bookRef)
    || left.chunk.chapterIndex - right.chunk.chapterIndex
    || lexicalCompare(left.chunk.sectionPath.join("\u0000"), right.chunk.sectionPath.join("\u0000"))
    || left.chunk.charOffsets.start - right.chunk.charOffsets.start
    || left.chunk.charOffsets.end - right.chunk.charOffsets.end
    || lexicalCompare(left.chunk.rawText, right.chunk.rawText)
    || left.inputIndex - right.inputIndex;
}

/**
 * Select the strongest quote candidates while capping representation per chapter.
 * May return fewer than requested when uneven chapter inventories exhaust the cap.
 */
export function selectQuoteTiles(chunks: readonly BookChunk[], count: number): BookChunk[] {
  const requested = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (requested === 0 || chunks.length === 0) return [];

  const chapterCount = new Set(chunks.map(chapterKey)).size;
  const perChapterLimit = Math.ceil(requested / chapterCount);
  const selected: BookChunk[] = [];
  const selectedByChapter = new Map<string, number>();
  const ranked = chunks
    .map((chunk, inputIndex) => ({ chunk, inputIndex, score: scoreChunk(chunk) }))
    .sort(compareChunks);

  for (const item of ranked) {
    if (selected.length === requested) break;
    const key = chapterKey(item.chunk);
    const used = selectedByChapter.get(key) ?? 0;
    if (used >= perChapterLimit) continue;
    selected.push(item.chunk);
    selectedByChapter.set(key, used + 1);
  }
  return selected;
}
