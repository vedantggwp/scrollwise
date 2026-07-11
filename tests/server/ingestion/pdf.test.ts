import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parsePdf } from "@/lib/server/ingestion/pdf";
import { IngestionError } from "@/lib/server/ingestion/types";

const fixture = path.join(process.cwd(), "tests", "fixtures", "attention.pdf");

describe("parsePdf", () => {
  it("parses pages into detected headings and paragraphs", async () => {
    const book = await parsePdf(await readFile(fixture));

    expect(book.metadata.title).toContain("Attention");
    expect(book.chapters.length).toBeGreaterThan(3);
    expect(book.chapters.every((chapter, index) => chapter.pageNumber === index + 1)).toBe(true);
    expect(book.chapters.flatMap((chapter) => chapter.blocks)
      .some((block) => block.type === "heading" && block.text.includes("Introduction")))
      .toBe(true);
    expect(book.chapters.flatMap((chapter) => chapter.blocks)
      .some((block) => block.type === "paragraph" && block.text.length > 40))
      .toBe(true);
  });

  it("returns a typed error for non-PDF bytes", async () => {
    const failure = parsePdf(new TextEncoder().encode("not a pdf"));
    await expect(failure).rejects.toBeInstanceOf(IngestionError);
    await expect(parsePdf(new TextEncoder().encode("not a pdf"))).rejects.toMatchObject({
      format: "pdf",
      code: "INVALID_PDF",
    });
  });
});
