import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { chunkBook, parseEpub, type BookChunk } from "@/lib/server/ingestion";
import { extractExcerpt, scoreChunk, selectQuoteTiles } from "@/lib/server/scoring";

function makeChunk(rawText: string, overrides: Partial<BookChunk> = {}): BookChunk {
  return {
    bookRef: "book",
    chapterIndex: 0,
    sectionPath: ["Chapter One"],
    breadcrumb: "Book › Chapter One",
    rawText,
    embeddableText: `Book › Chapter One\n\n${rawText}`,
    charOffsets: { start: 0, end: rawText.length },
    tokenCount: 0,
    ...overrides,
  };
}

describe("scoreChunk", () => {
  it("scores quotable, self-contained prose above boilerplate deterministically", () => {
    const quotable = makeChunk(
      "You have power over your mind—not outside events. Realize this, and you will "
      + "find strength. The happiness of your life depends upon the quality of your "
      + "thoughts. When you arise in the morning, think of what a privilege it is to "
      + "be alive: to think, to enjoy, to love. Nothing happens to anyone that they "
      + "are not fitted by nature to bear.",
    );
    const contents = makeChunk(
      "CONTENTS\n\nI. INTRODUCTION ........ 1\nII. BACKGROUND ........ 7\n"
      + "III. METHODS ........ 19\nIV. REFERENCES ........ 42",
      { sectionPath: ["TABLE OF CONTENTS"] },
    );
    const license = makeChunk(
      "THE FULL PROJECT GUTENBERG LICENSE. This electronic work is provided under "
      + "the terms of use at www.gutenberg.org. Redistribution, copyright, trademark, "
      + "and warranty provisions apply to every copy of this electronic work.",
      { sectionPath: ["License"] },
    );

    expect(scoreChunk(quotable)).toBe(0.87);
    expect(scoreChunk(contents)).toBe(0);
    expect(scoreChunk(license)).toBe(0);
    expect(scoreChunk(quotable)).toBe(scoreChunk({ ...quotable }));
    expect(scoreChunk(quotable)).toBeGreaterThan(scoreChunk(contents));
    expect(scoreChunk(quotable)).toBeGreaterThan(scoreChunk(license));
    for (const chunk of [quotable, contents, license]) {
      expect(scoreChunk(chunk)).toBeGreaterThanOrEqual(0);
      expect(scoreChunk(chunk)).toBeLessThanOrEqual(1);
    }
  });
});

describe("extractExcerpt", () => {
  it("drops boundary fragments and chooses complete contiguous sentences", () => {
    const chunk = makeChunk(
      "continuation from an earlier sentence ends here. Wisdom begins when we stop "
      + "pretending that every answer is already known. The mind becomes freer when "
      + "it can examine an uncomfortable truth without immediately turning away. "
      + "This trailing fragment has no ending",
    );

    const excerpt = extractExcerpt(chunk);
    expect(excerpt).toMatch(/^(?:\p{Lu}|["'“‘])/u);
    expect(excerpt).toMatch(/[.!?]["'’”]?$/u);
    expect(excerpt).not.toContain("continuation from an earlier sentence");
    expect(excerpt).not.toContain("This trailing fragment");
    expect(excerpt.length).toBeGreaterThanOrEqual(120);
    expect(excerpt.length).toBeLessThanOrEqual(320);
  });

  it("returns no display text when a chunk contains no complete sentence", () => {
    expect(extractExcerpt(makeChunk("an incomplete boundary fragment only"))).toBe("");
  });

  it("rejects a capitalized leading overlap fragment", () => {
    const chunk = makeChunk(
      "Marcus was named earlier in the sentence. A complete sentence begins safely here "
      + "and carries enough context to stand independently. Another complete sentence "
      + "finishes the thought for a reader.",
      { charOffsets: { start: 500, end: 690 } },
    );

    expect(extractExcerpt(chunk)).not.toContain("Marcus was named earlier");
    expect(extractExcerpt(chunk)).toMatch(/^A complete sentence/);
  });

  it("keeps honorifics with the sentence they introduce", () => {
    const excerpt = extractExcerpt(makeChunk(
      "She extended her gloved hand toward Mr. Aldren, who accepted it with a grave bow "
      + "and spoke with the careful courtesy that made every ordinary exchange feel ceremonial. "
      + "The room grew quieter as the conversation moved on to matters no one had expected to discuss.",
    ));

    expect(excerpt).toContain("gloved hand toward Mr. Aldren");
    expect(excerpt).not.toMatch(/\b(?:Mr|Mrs|Ms|Dr|St|Prof|Sr|Jr|e\.g|i\.e|etc|vs)\.$/i);
  });
});

describe("selectQuoteTiles", () => {
  it("does not select the same excerpt from overlapping Meditations chunks twice", async () => {
    const epubPath = path.join(process.cwd(), "tests", "fixtures", "meditations.epub");
    const book = parseEpub(await readFile(epubPath));
    const tiles = selectQuoteTiles(chunkBook(book, { bookRef: "meditations" }), 40);
    const normalized = tiles.map((tile) => tile.excerpt.replace(/\s+/g, " ").trim().toLowerCase());

    expect(new Set(normalized).size).toBe(normalized.length);
  }, 15_000);

  it("breaks equal-score ties by canonical chunk position", () => {
    const equalChunks = [2, 0, 1].map((chapterIndex) => makeChunk(
      `${String.fromCharCode(65 + chapterIndex)} plain complete sentence offers enough context. Another complete sentence `
      + "keeps every candidate's heuristic score identical for this selection test.",
      {
        chapterIndex,
        sectionPath: [`Chapter ${chapterIndex}`],
        charOffsets: { start: 0, end: 130 },
      },
    ));

    expect(selectQuoteTiles(equalChunks, 3).map((tile) => tile.chunk.chapterIndex))
      .toEqual([0, 1, 2]);
  });

  it("honors chapter caps and does not use duplicates to fill them", () => {
    const commonText = "A complete thought stands on its own. A second sentence gives it context.";
    const chunks = [
      makeChunk(commonText, { chapterIndex: 0, charOffsets: { start: 0, end: 76 } }),
      makeChunk(commonText, { chapterIndex: 0, charOffsets: { start: 80, end: 156 } }),
      makeChunk(commonText, { chapterIndex: 0, charOffsets: { start: 160, end: 236 } }),
      makeChunk(commonText, { chapterIndex: 1, charOffsets: { start: 0, end: 76 } }),
    ];

    expect(selectQuoteTiles(chunks, 4)).toHaveLength(2);
    expect(selectQuoteTiles(chunks, 0)).toEqual([]);
    expect(selectQuoteTiles([], 4)).toEqual([]);
  });

  it("spreads selections across chapters and is deterministic", async () => {
    const epubPath = path.join(process.cwd(), "tests", "fixtures", "meditations.epub");
    const book = parseEpub(await readFile(epubPath));
    const chunks = chunkBook(book, { bookRef: "meditations" });
    const count = 12;
    const distinctChapters = new Set(chunks.map((chunk) => chunk.chapterIndex)).size;
    const perChapterLimit = Math.ceil(count / distinctChapters);

    const first = selectQuoteTiles(chunks, count);
    const second = selectQuoteTiles(chunks, count);
    const reversed = selectQuoteTiles([...chunks].reverse(), count);

    expect(first).toHaveLength(count);
    expect(second).toEqual(first);
    expect(reversed).toEqual(first);
    const selectedCounts = new Map<number, number>();
    for (const tile of first) {
      selectedCounts.set(
        tile.chunk.chapterIndex,
        (selectedCounts.get(tile.chunk.chapterIndex) ?? 0) + 1,
      );
      expect(tile.excerpt).toMatch(/^(?:\p{Lu}|["'“‘])/u);
      expect(tile.excerpt).toMatch(/[.!?]["'’”]?$/u);
    }
    expect(Math.max(...selectedCounts.values())).toBeLessThanOrEqual(perChapterLimit);
  }, 15_000);
});
