import {
  extractTextItems,
  getDocumentProxy,
  getMeta,
  type StructuredTextItem,
} from "unpdf";

import {
  IngestionError,
  type BookBlock,
  type BookChapter,
  type StructuredBook,
} from "./types";

interface TextLine {
  text: string;
  fontSize: number;
  y: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function appendText(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  if (/[-/([\u2014]$/.test(left) || /^[,.;:!?%)\]]/.test(right)) return left + right;
  return `${left} ${right}`;
}

function linesFromItems(items: StructuredTextItem[]): TextLine[] {
  const lines: TextLine[] = [];
  let current: TextLine | undefined;

  const flush = (): void => {
    if (current?.text.trim()) lines.push({ ...current, text: current.text.trim() });
    current = undefined;
  };

  for (const item of items) {
    const text = item.str.replace(/\s+/g, " ").trim();
    if (!text) {
      if (item.hasEOL) flush();
      continue;
    }
    const sameLine = current
      && Math.abs(current.y - item.y) <= Math.max(1.5, item.fontSize * 0.25);
    if (!sameLine) flush();
    if (!current) current = { text: "", fontSize: item.fontSize, y: item.y };
    current.text = appendText(current.text, text);
    current.fontSize = Math.max(current.fontSize, item.fontSize);
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

function isHeading(line: TextLine, bodySize: number): boolean {
  const threshold = Math.max(bodySize * 1.15, bodySize + 1.2);
  return line.fontSize >= threshold
    && line.text.length <= 180
    && line.text.split(/\s+/).length <= 24;
}

function headingLevel(fontSize: number, bodySize: number): number {
  if (fontSize >= bodySize * 1.6) return 1;
  if (fontSize >= bodySize * 1.3) return 2;
  return 3;
}

function pageBlocks(items: StructuredTextItem[], bodySize: number): BookBlock[] {
  const lines = linesFromItems(items);
  const blocks: BookBlock[] = [];
  let paragraph: string[] = [];
  let previous: TextLine | undefined;

  const flushParagraph = (): void => {
    const text = paragraph.join(" ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  for (const line of lines) {
    if (isHeading(line, bodySize)) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingLevel(line.fontSize, bodySize),
        text: line.text,
      });
      previous = line;
      continue;
    }

    const verticalGap = previous ? Math.abs(previous.y - line.y) : 0;
    if (paragraph.length > 0 && verticalGap > bodySize * 1.65) flushParagraph();
    paragraph.push(line.text);
    previous = line;
  }
  flushParagraph();
  return blocks;
}

function metadataValue(info: Record<string, unknown>, key: string): string {
  const value = info[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Parse a PDF into page chapters with layout-derived headings and paragraphs. */
export async function parsePdf(input: Buffer | Uint8Array): Promise<StructuredBook> {
  if (input.byteLength === 0) {
    throw new IngestionError("pdf", "INVALID_INPUT", "PDF input is empty");
  }
  const bytes = new Uint8Array(input);
  const signature = new TextDecoder().decode(bytes.subarray(0, 5));
  if (signature !== "%PDF-") {
    throw new IngestionError("pdf", "INVALID_PDF", "Input does not have a PDF signature");
  }

  let document: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    document = await getDocumentProxy(bytes);
    const [{ items, totalPages }, meta] = await Promise.all([
      extractTextItems(document),
      getMeta(document),
    ]);
    const fontSizes = items.flatMap((page) => page
      .filter((item) => item.str.trim() && item.fontSize > 0)
      .map((item) => item.fontSize));
    const bodySize = median(fontSizes.filter((size) => size >= 7)) || median(fontSizes) || 10;
    const chapters: BookChapter[] = items.map((pageItems, index) => {
      const blocks = pageBlocks(pageItems, bodySize);
      const firstHeading = blocks.find((block) => block.type === "heading");
      return {
        title: firstHeading?.text ?? `Page ${index + 1}`,
        pageNumber: index + 1,
        blocks,
      };
    });
    if (totalPages === 0 || !chapters.some((chapter) => chapter.blocks.length > 0)) {
      throw new IngestionError("pdf", "EMPTY_DOCUMENT", "PDF contains no extractable text");
    }

    const largestHeading = linesFromItems(items[0] ?? [])
      .filter((line) => isHeading(line, bodySize) && !/^arxiv:/i.test(line.text))
      .sort((a, b) => b.fontSize - a.fontSize)[0];
    const info = meta.info as Record<string, unknown>;
    return {
      metadata: {
        title: metadataValue(info, "Title") || largestHeading?.text || "Untitled PDF",
        author: metadataValue(info, "Author") || "Unknown author",
      },
      chapters,
    };
  } catch (error) {
    if (error instanceof IngestionError) throw error;
    throw new IngestionError("pdf", "INVALID_PDF", "Unable to parse PDF input", {
      cause: error,
    });
  } finally {
    if (document) await document.destroy();
  }
}
