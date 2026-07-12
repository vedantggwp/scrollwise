import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { feedFixtures } from "@/lib/mock/feed-fixtures";
import { parseEpub, type BookChunk, type StructuredBook } from "@/lib/server/ingestion";

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function bookText(book: StructuredBook): string {
  return book.chapters
    .flatMap((chapter) => chapter.blocks.map((block) => block.text))
    .join(" ");
}

describe("Feed2 fixture truth", () => {
  it("uses only verbatim passages from the fixture EPUBs with matching chapter breadcrumbs", async () => {
    const fixturesDirectory = path.join(process.cwd(), "tests", "fixtures");
    const books = new Map<string, StructuredBook>([
      ["meditations", parseEpub(await readFile(path.join(fixturesDirectory, "meditations.epub")))],
      ["twenty-four-hours", parseEpub(await readFile(path.join(fixturesDirectory, "24hours.epub")))],
    ]);
    const quotedPassages: Array<{ chunk: BookChunk; quote: string }> = feedFixtures.flatMap((item) => {
      if (item.kind === "quote") return [{ chunk: item.chunk, quote: item.chunk.rawText }];
      if (item.kind === "question") return item.citations;
      return [];
    });

    for (const { chunk, quote } of quotedPassages) {
      const book = books.get(chunk.bookRef);
      expect(book, `unsupported source ${chunk.bookRef}`).toBeDefined();
      if (!book) continue;

      const passage = normalize(quote);
      expect(normalize(bookText(book))).toContain(passage);
      expect(book.chapters.some((chapter) => (
        normalize(chapter.blocks.map((block) => block.text).join(" ")).includes(passage)
        && chunk.breadcrumb.endsWith(`› ${chapter.title}`)
      ))).toBe(true);
    }
  }, 15_000);
});
