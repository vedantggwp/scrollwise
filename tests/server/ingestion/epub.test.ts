import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseEpub } from "@/lib/server/ingestion/epub";
import { IngestionError } from "@/lib/server/ingestion/types";

const fixture = (name: string) => path.join(process.cwd(), "tests", "fixtures", name);

describe("parseEpub", () => {
  it.each([
    ["meditations.epub", "Meditations"],
    ["24hours.epub", "How to Live on 24 Hours a Day"],
  ])("parses ordered chapters from %s", async (filename, expectedTitle) => {
    const book = parseEpub(await readFile(fixture(filename)));

    expect(book.metadata.title).toBe(expectedTitle);
    expect(book.metadata.author.length).toBeGreaterThan(0);
    expect(book.chapters.length).toBeGreaterThan(3);
    for (const chapter of book.chapters) {
      expect(chapter.title.length).toBeGreaterThan(0);
      expect(chapter.blocks.some((block) => block.type === "paragraph" && block.text.length > 0))
        .toBe(true);
    }
  });

  it("wraps a truncated ZIP failure in a typed error", async () => {
    const valid = await readFile(fixture("meditations.epub"));
    const truncated = valid.subarray(0, 100);

    expect(() => parseEpub(truncated)).toThrowError(IngestionError);
    try {
      parseEpub(truncated);
    } catch (error) {
      expect(error).toMatchObject({ format: "epub", code: "INVALID_ARCHIVE" });
    }
  });
});
