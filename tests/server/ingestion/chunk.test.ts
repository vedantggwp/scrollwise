import { readFile } from "node:fs/promises";
import path from "node:path";

import { getEncoding } from "js-tiktoken";
import { describe, expect, it } from "vitest";

import { chapterSource, chunkBook } from "@/lib/server/ingestion/chunk";
import { parseEpub } from "@/lib/server/ingestion/epub";

const tokenizer = getEncoding("cl100k_base");
const fixture = path.join(process.cwd(), "tests", "fixtures", "meditations.epub");

describe("chunkBook", () => {
  it("creates bounded chunks with breadcrumbs, exact offsets, and overlap", async () => {
    const book = parseEpub(await readFile(fixture));
    const chunks = chunkBook(book, { bookRef: "meditations" });

    expect(chunks.length).toBeGreaterThan(20);
    expect(chunks.every((chunk) => chunk.tokenCount <= 512)).toBe(true);
    const nonTailChunks = chunks.filter((chunk, index) => {
      const next = chunks[index + 1];
      return next
        && next.chapterIndex === chunk.chapterIndex
        && JSON.stringify(next.sectionPath) === JSON.stringify(chunk.sectionPath);
    });
    const fullSized = nonTailChunks.filter((chunk) => chunk.tokenCount >= 400);
    expect(
      fullSized.length / nonTailChunks.length,
    ).toBeGreaterThanOrEqual(0.95);

    for (const chunk of chunks) {
      const chapter = book.chapters[chunk.chapterIndex];
      const source = chapterSource(chapter);
      expect(chunk.bookRef).toBe("meditations");
      expect(chunk.rawText).toBe(source.slice(chunk.charOffsets.start, chunk.charOffsets.end));
      expect(chunk.breadcrumb).toBe([
        book.metadata.title,
        chapter.title,
        ...chunk.sectionPath,
      ].join(" › "));
      expect(chunk.embeddableText).toBe(`${chunk.breadcrumb}\n\n${chunk.rawText}`);
      expect(chunk.tokenCount).toBe(tokenizer.encode(chunk.embeddableText).length);
    }

    const overlappingPairs = chunks.slice(1).flatMap((chunk, index) => {
      const previous = chunks[index];
      const sameSection = chunk.chapterIndex === previous.chapterIndex
        && JSON.stringify(chunk.sectionPath) === JSON.stringify(previous.sectionPath);
      return sameSection ? [[previous, chunk] as const] : [];
    });
    expect(overlappingPairs.length).toBeGreaterThan(5);
    for (const [previous, current] of overlappingPairs) {
      const overlap = previous.charOffsets.end - current.charOffsets.start;
      expect(overlap).toBeGreaterThan(0);
      const overlapText = previous.rawText.slice(-overlap);
      expect(current.rawText.startsWith(overlapText)).toBe(true);
      const ratio = tokenizer.encode(overlapText).length / tokenizer.encode(previous.rawText).length;
      expect(ratio).toBeGreaterThanOrEqual(0.1);
      expect(ratio).toBeLessThanOrEqual(0.15);
    }
  });
});
