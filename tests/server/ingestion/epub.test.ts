import { readFile } from "node:fs/promises";
import path from "node:path";

import { strToU8, zipSync } from "fflate";
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

  it("splits TOC chapters when an EPUB2 anchor is nested inside a heading", () => {
    const epub = zipSync({
      "META-INF/container.xml": strToU8(`<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>`),
      "OEBPS/book.opf": strToU8(`<?xml version="1.0"?><package><metadata><title>Anchor book</title><creator>Author</creator></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine toc="toc"><itemref idref="chapter"/></spine></package>`),
      "OEBPS/toc.ncx": strToU8(`<?xml version="1.0"?><ncx><navMap><navPoint><navLabel><text>Chapter One</text></navLabel><content src="chapter.xhtml#c1"/></navPoint><navPoint><navLabel><text>Chapter Two</text></navLabel><content src="chapter.xhtml#c2"/></navPoint></navMap></ncx>`),
      "OEBPS/chapter.xhtml": strToU8(`<html><body><h2><a name="c1"></a>Chapter One</h2><p>First chapter text.</p><h2><a id="c2"></a>Chapter Two</h2><p>Second chapter text.</p></body></html>`),
    });

    expect(parseEpub(epub).chapters.map((chapter) => chapter.title))
      .toEqual(["Chapter One", "Chapter Two"]);
  });
});
